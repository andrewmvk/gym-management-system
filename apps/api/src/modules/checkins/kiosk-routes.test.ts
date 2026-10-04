import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '@api/app';
import { env } from '@api/config/env';
import { db, pool } from '@api/db/client';
import { dUsers, fCheckIns } from '@api/db/schema';
import { KIOSK_KEY_HEADER } from '@api/modules/checkins/kiosk-routes';
import { resetTestDatabase } from '@api/test/database';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

let server: Server;
let baseUrl: string;

const embedding = (seed: number) => Array.from({ length: 128 }, (_, index) => (index + seed) / 1000);

function getEmbeddings(key?: string) {
  const headers: Record<string, string> = key === undefined ? {} : { [KIOSK_KEY_HEADER]: key };
  return fetch(`${baseUrl}/kiosk/embeddings`, { headers });
}

beforeAll(async () => {
  server = createApp(env).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

describe('GET /kiosk/embeddings', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it('answers 401 without a key, with a wrong key, and with a key of another length', async () => {
    expect((await getEmbeddings()).status).toBe(401);
    expect((await getEmbeddings('wrong-key')).status).toBe(401);
    expect((await getEmbeddings(`${env.KIOSK_API_KEY}x`)).status).toBe(401);
    expect((await getEmbeddings('')).status).toBe(401);
  });

  it('returns only memberId and embedding for registered members with a stored embedding', async () => {
    const base = { name: 'Member', passwordHash: 'hash', referencePhotoPath: 'photo.jpg' };
    const [included] = await db
      .insert(dUsers)
      .values({ ...base, email: 'in@example.com', referenceFaceEmbedding: embedding(1) })
      .returning();
    await db.insert(dUsers).values([
      { ...base, email: 'nopass@example.com', passwordHash: null, referenceFaceEmbedding: embedding(4) },
      { ...base, email: 'noembedding@example.com' },
    ]);

    const response = await getEmbeddings(env.KIOSK_API_KEY);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{ memberId: included!.id, embedding: embedding(1) }]);
  });

  it('returns an empty list when nobody qualifies', async () => {
    const response = await getEmbeddings(env.KIOSK_API_KEY);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
});

describe('GET /kiosk/dev/members', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it('needs the kiosk key and lists the eligible members by name', async () => {
    await db.insert(dUsers).values([
      { email: 'b@example.com', name: 'Bruno', passwordHash: 'hash', referenceFaceEmbedding: embedding(1) },
      { email: 'a@example.com', name: 'Ana', passwordHash: 'hash', referenceFaceEmbedding: embedding(2) },
      { email: 'p@example.com', name: 'No Embedding', passwordHash: 'hash' },
    ]);

    expect((await fetch(`${baseUrl}/kiosk/dev/members`)).status).toBe(401);
    const response = await fetch(`${baseUrl}/kiosk/dev/members`, {
      headers: { [KIOSK_KEY_HEADER]: env.KIOSK_API_KEY },
    });

    expect(response.status).toBe(200);
    const members = (await response.json()) as { name: string }[];
    expect(members.map((member) => member.name)).toEqual(['Ana', 'Bruno']);
  });

  it('is not mounted in production', async () => {
    const productionServer = createApp({ ...env, NODE_ENV: 'production' }).listen(0);
    await new Promise((resolve) => productionServer.once('listening', resolve));
    const { port } = productionServer.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/kiosk/dev/members`, {
      headers: { [KIOSK_KEY_HEADER]: env.KIOSK_API_KEY },
    });
    await new Promise((resolve) => productionServer.close(resolve));

    expect(response.status).toBe(404);
  });
});

describe('POST /kiosk/checkins', () => {
  function postCheckIn(body: unknown, key?: string) {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (key !== undefined) headers[KIOSK_KEY_HEADER] = key;
    return fetch(`${baseUrl}/kiosk/checkins`, { method: 'POST', headers, body: JSON.stringify(body) });
  }

  async function createMember() {
    const [member] = await db.insert(dUsers).values({ email: 'member@example.com', name: 'Member' }).returning();
    return member!.id;
  }

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it('answers 401 without the right key and records nothing', async () => {
    const memberId = await createMember();

    expect((await postCheckIn({ memberId })).status).toBe(401);
    expect((await postCheckIn({ memberId }, 'wrong-key')).status).toBe(401);
    expect(await db.select().from(fCheckIns)).toHaveLength(0);
  });

  it('answers 400 for a malformed body and 404 for an unknown member, recording nothing', async () => {
    expect((await postCheckIn({ memberId: 'nope' }, env.KIOSK_API_KEY)).status).toBe(400);
    expect((await postCheckIn({}, env.KIOSK_API_KEY)).status).toBe(400);
    expect((await postCheckIn({ memberId: crypto.randomUUID() }, env.KIOSK_API_KEY)).status).toBe(404);
    expect(await db.select().from(fCheckIns)).toHaveLength(0);
  });

  it('answers 403 with reason membership_inactive for an inactive member and records nothing', async () => {
    const [lapsed] = await db
      .insert(dUsers)
      .values({ email: 'lapsed@example.com', name: 'Lapsed', membershipStatus: 'inactive' })
      .returning();

    const response = await postCheckIn({ memberId: lapsed!.id }, env.KIOSK_API_KEY);

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ reason: 'membership_inactive' });
    expect(await db.select().from(fCheckIns)).toHaveLength(0);
  });

  it('records the check-in as failed and still answers 200 when the turnstile is not configured', async () => {
    const memberId = await createMember();

    const response = await postCheckIn({ memberId }, env.KIOSK_API_KEY);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { checkInId: string; turnstileStatus: string };
    expect(body.turnstileStatus).toBe('failed');
    expect(Object.keys(body).sort()).toEqual(['checkInId', 'turnstileStatus']);
    const rows = await db.select().from(fCheckIns);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: body.checkInId, userId: memberId, turnstileStatus: 'failed' });
  });
});
