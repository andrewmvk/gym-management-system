import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '@api/app';
import { env } from '@api/config/env';
import { db, pool } from '@api/db/client';
import { dUsers } from '@api/db/schema';
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

  it('returns only memberId and embedding for cleared members with a password and an embedding', async () => {
    const base = { name: 'Member', passwordHash: 'hash', referencePhotoPath: 'photo.jpg' };
    const [included] = await db
      .insert(dUsers)
      .values({ ...base, email: 'in@example.com', aptitudeStatus: 'cleared', referenceFaceEmbedding: embedding(1) })
      .returning();
    await db.insert(dUsers).values([
      { ...base, email: 'pending@example.com', aptitudeStatus: 'pending', referenceFaceEmbedding: embedding(2) },
      { ...base, email: 'rejected@example.com', aptitudeStatus: 'rejected', referenceFaceEmbedding: embedding(3) },
      {
        ...base,
        email: 'nopass@example.com',
        passwordHash: null,
        aptitudeStatus: 'cleared',
        referenceFaceEmbedding: embedding(4),
      },
      { ...base, email: 'noembedding@example.com', aptitudeStatus: 'cleared' },
      { ...base, email: 'staff@example.com', aptitudeStatus: null, referenceFaceEmbedding: embedding(5) },
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
