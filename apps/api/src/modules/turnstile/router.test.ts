import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { db, pool } from '@api/db/client';
import { dTurnstileConfig, dUsers, fCheckIns, fUserPolicyOnUser } from '@api/db/schema';
import { SEED_ADMIN_EMAIL, SEED_TRAINER_EMAIL, seedBase } from '@api/db/seed';
import { logger } from '@api/lib/logger';
import { SESSION_COOKIE, signSessionToken } from '@api/modules/auth/session';
import { resetTestDatabase } from '@api/test/database';
import { appRouter } from '@api/trpc/app-router';
import { createContext } from '@api/trpc/context';
import { createCallerFactory } from '@api/trpc/procedures';
import { MEMBER_POLICY_IDS } from '@cadence/shared/auth';
import type { UpdateTurnstileConfigInput } from '@cadence/shared/schemas/turnstile';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const VALID_INPUT: UpdateTurnstileConfigInput = {
  method: 'POST',
  url: 'https://turnstile.example.com/doors/3/unlock?token=abcd-efgh-1234-5678',
  headers: [
    { name: 'Authorization', value: 'Bearer secret-token-9876', secret: true },
    { name: 'Content-Type', value: 'application/json', secret: false },
  ],
  bodyTemplate: '{"user": "{{memberId}}"}',
};

let server: Server;
let serverUrl: string;
let requestCount: number;

async function callerFor(token?: string) {
  const req = { cookies: token ? { [SESSION_COOKIE]: token } : {}, log: logger };
  const res = { cookie: vi.fn(), clearCookie: vi.fn() };
  const ctx = await createContext({ req, res } as unknown as CreateExpressContextOptions);
  return createCallerFactory(appRouter)(ctx);
}

async function tokenFor(email: string) {
  const [user] = await db.select().from(dUsers).where(eq(dUsers.email, email));
  return signSessionToken(user!.id);
}

async function memberToken() {
  const [member] = await db.insert(dUsers).values({ email: 'member@example.com', name: 'Member' }).returning();
  await db
    .insert(fUserPolicyOnUser)
    .values(MEMBER_POLICY_IDS.map((policyId) => ({ userId: member!.id, policyId, effect: 'granted' as const })));
  return signSessionToken(member!.id);
}

beforeAll(async () => {
  server = createServer((_req, res) => {
    requestCount++;
    res.writeHead(200).end('ok');
  }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  serverUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/unlock`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

describe('turnstile config', () => {
  beforeEach(async () => {
    requestCount = 0;
    await resetTestDatabase();
    await seedBase();
  });

  it('creates the singleton on first read and reports it as not configured', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));

    const config = await caller.turnstile.getConfig();

    expect(config).toMatchObject({ method: 'POST', url: '', headers: [], bodyTemplate: '', isConfigured: false });
    expect(await db.select().from(dTurnstileConfig)).toHaveLength(1);
  });

  it('masks secret header values and URL query values on read, leaving the last four characters', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));

    const saved = await caller.turnstile.updateConfig(VALID_INPUT);

    expect(saved.isConfigured).toBe(true);
    expect(saved.url).toBe('https://turnstile.example.com/doors/3/unlock?token=••••5678');
    expect(saved.headers).toEqual([
      { name: 'Authorization', value: '••••9876', secret: true },
      { name: 'Content-Type', value: 'application/json', secret: false },
    ]);
    const everything = JSON.stringify([saved, await caller.turnstile.getConfig()]);
    expect(everything).not.toContain('secret-token');
    expect(everything).not.toContain('abcd-efgh');
  });

  it('keeps stored secrets when the masked values come back unchanged, and replaces them otherwise', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    const saved = await caller.turnstile.updateConfig(VALID_INPUT);

    await caller.turnstile.updateConfig({
      ...saved,
      url: saved.url.replace('/doors/3', '/doors/4'),
      bodyTemplate: '',
    });
    let [row] = await db.select().from(dTurnstileConfig);
    expect(row).toMatchObject({
      url: 'https://turnstile.example.com/doors/4/unlock?token=abcd-efgh-1234-5678',
      bodyTemplate: '',
    });
    expect(row!.headers[0]!.value).toBe('Bearer secret-token-9876');

    await caller.turnstile.updateConfig({
      ...saved,
      url: 'https://turnstile.example.com/doors/4/unlock?token=fresh-token-0000',
      headers: [{ name: 'authorization', value: 'Bearer fresh-secret-1111', secret: true }],
    });
    [row] = await db.select().from(dTurnstileConfig);
    expect(row!.url).toContain('token=fresh-token-0000');
    expect(row!.headers).toEqual([{ name: 'authorization', value: 'Bearer fresh-secret-1111', secret: true }]);
    expect(await db.select().from(dTurnstileConfig)).toHaveLength(1);
  });

  it('records who made the last change', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    await caller.turnstile.updateConfig(VALID_INPUT);

    const [admin] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_ADMIN_EMAIL));
    const [row] = await db.select().from(dTurnstileConfig);
    expect(row!.updatedByUserId).toBe(admin!.id);
  });

  it('rejects an invalid URL, a bad header, a GET body, and an unknown placeholder', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    const invalidInputs: UpdateTurnstileConfigInput[] = [
      { ...VALID_INPUT, url: 'not a url' },
      { ...VALID_INPUT, url: 'ftp://x.example.com' },
      { ...VALID_INPUT, headers: [{ name: 'bad name', value: 'x', secret: false }] },
      { ...VALID_INPUT, headers: [{ name: 'X-Key', value: '', secret: true }] },
      {
        ...VALID_INPUT,
        headers: [
          { name: 'X-Key', value: 'a', secret: false },
          { name: 'x-key', value: 'b', secret: false },
        ],
      },
      { ...VALID_INPUT, method: 'GET', bodyTemplate: '{"a": 1}' },
      { ...VALID_INPUT, bodyTemplate: '{"user": "{{password}}"}' },
      { ...VALID_INPUT, method: 'DELETE' as never },
    ];

    for (const input of invalidInputs) {
      await expect(caller.turnstile.updateConfig(input), JSON.stringify(input)).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    }
    expect(await db.select().from(dTurnstileConfig)).toHaveLength(0);
  });

  it('accepts the simplest configuration: a method and a URL', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));

    const saved = await caller.turnstile.updateConfig({ method: 'GET', url: serverUrl, headers: [], bodyTemplate: '' });

    expect(saved).toMatchObject({ method: 'GET', url: serverUrl, headers: [], isConfigured: true });
  });

  it('answers FORBIDDEN to a trainer and a member, and UNAUTHORIZED to a signed-out caller', async () => {
    for (const token of [await tokenFor(SEED_TRAINER_EMAIL), await memberToken()]) {
      const caller = await callerFor(token);
      await expect(caller.turnstile.getConfig()).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(caller.turnstile.updateConfig(VALID_INPUT)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(caller.turnstile.testConnection()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }

    const anonymous = await callerFor();
    await expect(anonymous.turnstile.getConfig()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(anonymous.turnstile.testConnection()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(await db.select().from(dTurnstileConfig)).toHaveLength(0);
    expect(requestCount).toBe(0);
  });
});

describe('turnstile test connection', () => {
  beforeEach(async () => {
    requestCount = 0;
    await resetTestDatabase();
    await seedBase();
  });

  it('sends the saved request and reports the outcome without recording a check-in', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    await caller.turnstile.updateConfig({ method: 'GET', url: serverUrl, headers: [], bodyTemplate: '' });

    const result = await caller.turnstile.testConnection();

    expect(result).toMatchObject({ status: 'success', response: { httpStatus: 200, body: 'ok' } });
    expect(requestCount).toBe(1);
    expect(await db.select().from(fCheckIns)).toHaveLength(0);
  });

  it('reports not_configured as a failed result and sends nothing', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));

    expect(await caller.turnstile.testConnection()).toMatchObject({ status: 'failed', error: 'not_configured' });
    expect(requestCount).toBe(0);
  });
});
