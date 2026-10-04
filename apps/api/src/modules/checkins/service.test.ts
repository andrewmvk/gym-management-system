import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { db, pool } from '@api/db/client';
import { dTurnstileConfig, dUsers, fCheckIns, TURNSTILE_CONFIG_ID } from '@api/db/schema';
import { getTurnstileSummary, listRecentCheckIns, recordCheckIn } from '@api/modules/checkins/service';
import { resetTestDatabase } from '@api/test/database';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const API_KEY = 'secret-turnstile-key-1234';

type Handler = (req: IncomingMessage, res: ServerResponse, body: string) => void;

let server: Server;
let baseUrl: string;
let handler: Handler;
let received: { method: string; url: string; headers: IncomingMessage['headers']; body: string }[];

async function configureTurnstile(config: Partial<typeof dTurnstileConfig.$inferInsert> = {}) {
  await db.insert(dTurnstileConfig).values({
    id: TURNSTILE_CONFIG_ID,
    method: 'POST',
    url: baseUrl,
    headers: [{ name: 'x-api-key', value: API_KEY, secret: true }],
    bodyTemplate: '{"user": "{{memberId}}"}',
    ...config,
  });
}

async function createMember() {
  const [member] = await db
    .insert(dUsers)
    .values({ email: `${crypto.randomUUID()}@example.com`, name: 'Member' })
    .returning();
  return member!.id;
}

async function checkInsOf(userId: string) {
  return db.select().from(fCheckIns).where(eq(fCheckIns.userId, userId));
}

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      received.push({ method: req.method ?? '', url: req.url ?? '', headers: req.headers, body });
      handler(req, res, body);
    });
  }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/unlock`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

beforeEach(async () => {
  await resetTestDatabase();
  received = [];
  handler = (_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ opened: true }));
  };
});

describe('recordCheckIn (RN-09)', () => {
  const failureModes: {
    name: string;
    arrange: () => Promise<void>;
    expectedError: string;
    expectedHttpStatus?: number;
  }[] = [
    {
      name: 'a non-2xx answer',
      arrange: async () => {
        handler = (_req, res) => {
          res.writeHead(503).end('down for maintenance');
        };
        await configureTurnstile({});
      },
      expectedError: 'http_error',
      expectedHttpStatus: 503,
    },
    {
      name: 'a timeout',
      arrange: async () => {
        handler = () => {};
        await configureTurnstile({});
      },
      expectedError: 'timeout',
    },
    {
      name: 'a network error',
      arrange: () => configureTurnstile({ url: 'http://127.0.0.1:1/unlock' }),
      expectedError: 'network_error',
    },
    { name: 'no configuration at all', arrange: async () => {}, expectedError: 'not_configured' },
    {
      name: 'a saved configuration without a URL',
      arrange: () => configureTurnstile({ url: '' }),
      expectedError: 'not_configured',
    },
  ];

  it.each(failureModes)('records exactly one check-in tagged failed on $name', async (mode) => {
    await mode.arrange();
    const memberId = await createMember();

    const outcome = await recordCheckIn(memberId, { timeoutMs: 150 });

    expect(outcome).toMatchObject({ kind: 'recorded', turnstileStatus: 'failed' });
    const rows = await checkInsOf(memberId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ turnstileStatus: 'failed', turnstileResponse: { error: mode.expectedError } });
    if (mode.expectedHttpStatus) {
      expect(rows[0]!.turnstileResponse).toMatchObject({ response: { httpStatus: mode.expectedHttpStatus } });
    }
    expect(JSON.stringify(rows[0]!.turnstileResponse)).not.toContain(API_KEY);
  });

  it('records exactly one check-in tagged success when the turnstile answers 2xx', async () => {
    await configureTurnstile({});
    const memberId = await createMember();

    const outcome = await recordCheckIn(memberId);

    expect(outcome).toMatchObject({ kind: 'recorded', turnstileStatus: 'success' });
    const rows = await checkInsOf(memberId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      turnstileStatus: 'success',
      turnstileResponse: { response: { httpStatus: 200, body: { opened: true } } },
    });
    expect(rows[0]!.turnstileResponse).not.toHaveProperty('error');
  });

  it('sends the saved method, URL path, headers and body with the placeholders filled in', async () => {
    await configureTurnstile({
      method: 'PUT',
      url: `${baseUrl}/doors/3/unlock?channel=1`,
      headers: [
        { name: 'Authorization', value: 'Bearer abc', secret: true },
        { name: 'Content-Type', value: 'application/json', secret: false },
      ],
      bodyTemplate: '{"who": "{{memberId}}", "when": "{{ timestamp }}"}',
    });
    const memberId = await createMember();

    await recordCheckIn(memberId);

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ method: 'PUT', url: '/unlock/doors/3/unlock?channel=1' });
    expect(received[0]!.headers.authorization).toBe('Bearer abc');
    const body = JSON.parse(received[0]!.body);
    expect(body.who).toBe(memberId);
    expect(Number.isNaN(Date.parse(body.when))).toBe(false);
  });

  it('sends a GET without a body and a POST without a template with an empty body', async () => {
    const memberId = await createMember();

    await configureTurnstile({ method: 'GET', url: `${baseUrl}?turn=on` });
    expect(await recordCheckIn(memberId)).toMatchObject({ turnstileStatus: 'success' });
    await db.delete(dTurnstileConfig);
    await configureTurnstile({ method: 'POST', bodyTemplate: '' });
    expect(await recordCheckIn(memberId)).toMatchObject({ turnstileStatus: 'success' });

    expect(received.map((request) => [request.method, request.body])).toEqual([
      ['GET', ''],
      ['POST', ''],
    ]);
  });

  it('records nothing for an unknown member and never calls the turnstile', async () => {
    await configureTurnstile({});

    expect(await recordCheckIn(crypto.randomUUID())).toEqual({ kind: 'member_not_found' });

    expect(await db.select().from(fCheckIns)).toHaveLength(0);
    expect(received).toHaveLength(0);
  });

  it('refuses a member whose membership is inactive: no turnstile call and no check-in row', async () => {
    await configureTurnstile({});
    const [lapsed] = await db
      .insert(dUsers)
      .values({ email: 'lapsed@example.com', name: 'Lapsed', membershipStatus: 'inactive' })
      .returning();

    expect(await recordCheckIn(lapsed!.id)).toEqual({ kind: 'member_inactive' });

    expect(await db.select().from(fCheckIns)).toHaveLength(0);
    expect(received).toHaveLength(0);
  });

  it('lets the member in again once the membership is active', async () => {
    await configureTurnstile({});
    const [member] = await db
      .insert(dUsers)
      .values({ email: 'back@example.com', name: 'Back', membershipStatus: 'inactive' })
      .returning();
    await recordCheckIn(member!.id);
    await db.update(dUsers).set({ membershipStatus: 'active' }).where(eq(dUsers.id, member!.id));

    expect(await recordCheckIn(member!.id)).toMatchObject({ kind: 'recorded', turnstileStatus: 'success' });
  });
});

describe('check-in log and turnstile summary', () => {
  async function insertCheckIn(
    userId: string,
    checkedInAt: Date,
    turnstileStatus: 'success' | 'failed',
    turnstileResponse: Record<string, unknown> | null,
  ) {
    await db.insert(fCheckIns).values({ userId, checkedInAt, turnstileStatus, turnstileResponse });
  }

  it('maps each stored response to a short stable failure code, newest first', async () => {
    const memberId = await createMember();
    const at = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000);
    await insertCheckIn(memberId, at(60), 'success', { response: { httpStatus: 200, body: {} } });
    await insertCheckIn(memberId, at(50), 'failed', { response: null, error: 'not_configured' });
    await insertCheckIn(memberId, at(40), 'failed', { response: null, error: 'timeout' });
    await insertCheckIn(memberId, at(30), 'failed', { response: { httpStatus: 503, body: 'x' }, error: 'http_error' });
    await insertCheckIn(memberId, at(20), 'failed', { response: null, error: 'network_error' });
    await insertCheckIn(memberId, at(10), 'failed', { something: 'else' });
    await insertCheckIn(memberId, at(5), 'failed', null);

    const log = await listRecentCheckIns();

    expect(log.map((entry) => entry.failureReason)).toEqual([
      'unknown',
      'unknown',
      'network_error',
      'http_error',
      'timeout',
      'not_configured',
      null,
    ]);
    expect(log[6]).toMatchObject({ memberName: 'Member', turnstileStatus: 'success' });
    expect(Object.keys(log[0]!).sort()).toEqual([
      'checkedInAt',
      'failureReason',
      'id',
      'memberName',
      'turnstileStatus',
    ]);
  });

  it('caps the log at the requested limit', async () => {
    const memberId = await createMember();
    for (let minutes = 0; minutes < 5; minutes++) {
      await insertCheckIn(memberId, new Date(Date.now() - minutes * 60 * 1000), 'success', null);
    }

    expect(await listRecentCheckIns(3)).toHaveLength(3);
  });

  it('counts today’s total and failed check-ins and says whether the turnstile is configured', async () => {
    const memberId = await createMember();
    const now = new Date(2026, 9, 7, 12, 0);
    await insertCheckIn(memberId, new Date(2026, 9, 7, 8, 0), 'success', null);
    await insertCheckIn(memberId, new Date(2026, 9, 7, 9, 0), 'failed', { error: 'timeout' });
    await insertCheckIn(memberId, new Date(2026, 9, 6, 9, 0), 'failed', { error: 'timeout' });

    expect(await getTurnstileSummary(now)).toEqual({ failedToday: 1, totalToday: 2, isConfigured: false });

    await db.update(dTurnstileConfig).set({ url: baseUrl });
    expect(await getTurnstileSummary(now)).toMatchObject({ isConfigured: true });
  });

  it('never carries the API key, a response body or an embedding', async () => {
    await configureTurnstile({});
    const memberId = await createMember();
    await recordCheckIn(memberId);

    const payload = JSON.stringify([await listRecentCheckIns(), await getTurnstileSummary()]);

    expect(payload).not.toContain(API_KEY);
    expect(payload).not.toContain('opened');
    expect(payload).not.toMatch(/embedding|photo/i);
  });
});
