import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { MEMBER_POLICY_IDS } from '@cadence/shared/auth';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '@api/app';
import { env } from '@api/config/env';
import { db, pool } from '@api/db/client';
import { dUsers, fUserPolicyOnUser } from '@api/db/schema';
import { SEED_ADMIN_EMAIL, SEED_TRAINER_EMAIL, seedBase } from '@api/db/seed';
import { SESSION_COOKIE, signSessionToken } from '@api/modules/auth/session';
import { resetTestDatabase } from '@api/test/database';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

let uploadsDir: string;
let server: Server;
let baseUrl: string;

async function createMember(email: string) {
  const [member] = await db.insert(dUsers).values({ email, name: email, aptitudeStatus: 'cleared' }).returning();
  await db
    .insert(fUserPolicyOnUser)
    .values(MEMBER_POLICY_IDS.map((policyId) => ({ userId: member!.id, policyId, effect: 'granted' as const })));
  return member!.id;
}

async function userIdByEmail(email: string) {
  const [user] = await db.select().from(dUsers).where(eq(dUsers.email, email));
  return user!.id;
}

async function storeFile(ownerId: string, kind: string, extension = 'jpg') {
  const relativePath = `${ownerId}/${kind}/${randomUUID()}.${extension}`;
  await mkdir(path.join(uploadsDir, ownerId, kind), { recursive: true });
  await writeFile(path.join(uploadsDir, relativePath), JPEG);
  return relativePath;
}

function get(relativePath: string, userId?: string) {
  const headers: Record<string, string> = userId ? { cookie: `${SESSION_COOKIE}=${signSessionToken(userId)}` } : {};
  return fetch(`${baseUrl}/files/${relativePath}`, { headers });
}

beforeAll(async () => {
  uploadsDir = await mkdtemp(path.join(tmpdir(), 'cadence-files-'));
  server = createApp({ ...env, UPLOADS_DIR: uploadsDir }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(uploadsDir, { recursive: true, force: true });
  await pool.end();
});

describe('GET /files/*', () => {
  let ownerId: string;
  let otherMemberId: string;

  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
    ownerId = await createMember('owner@example.com');
    otherMemberId = await createMember('other@example.com');
  });

  it('requires a session', async () => {
    const file = await storeFile(ownerId, 'exam');

    expect((await get(file)).status).toBe(401);
  });

  it('serves an exam to its owner only', async () => {
    const file = await storeFile(ownerId, 'exam');

    const response = await get(file, ownerId);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(Buffer.from(await response.arrayBuffer())).toEqual(JPEG);

    expect((await get(file, otherMemberId)).status).toBe(403);
    expect((await get(file, await userIdByEmail(SEED_ADMIN_EMAIL))).status).toBe(403);
  });

  it('serves certificates only to a holder of review_certificates', async () => {
    const file = await storeFile(ownerId, 'certificate');

    expect((await get(file, await userIdByEmail(SEED_ADMIN_EMAIL))).status).toBe(200);
    expect((await get(file, await userIdByEmail(SEED_TRAINER_EMAIL))).status).toBe(403);
    expect((await get(file, ownerId)).status).toBe(403);
  });

  it('never serves a reference photo, not even to its owner or an admin', async () => {
    const file = await storeFile(ownerId, 'reference_photo');

    expect((await get(file, ownerId)).status).toBe(403);
    expect((await get(file, await userIdByEmail(SEED_ADMIN_EMAIL))).status).toBe(403);
  });

  it('answers 404 for malformed paths, traversal attempts, and missing files', async () => {
    const paths = [
      `${ownerId}/exam`,
      `${ownerId}/exam/notes.txt`,
      `${ownerId}/unknown/${randomUUID()}.jpg`,
      `..%2F..%2F${ownerId}/exam/${randomUUID()}.jpg`,
      `${ownerId}/exam/..%2F..%2F..%2Fsecret.jpg`,
      `${ownerId}/exam/${randomUUID()}.jpg`,
    ];

    for (const relativePath of paths) {
      expect((await get(relativePath, ownerId)).status, relativePath).toBe(404);
    }
  });
});

describe('tRPC body limit', () => {
  const oversizedBody = JSON.stringify({ email: 'a@b.dev', password: 'x'.repeat(2 * 1024 * 1024) });

  it('rejects a large body on a procedure that carries no files', async () => {
    const response = await fetch(`${baseUrl}/trpc/auth.login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: oversizedBody,
    });

    expect(response.status).toBe(413);
  });

  it('does not apply the default limit to a file procedure', async () => {
    const response = await fetch(`${baseUrl}/trpc/aptitude.savePhoto`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: oversizedBody,
    });

    expect(response.status).not.toBe(413);
  });
});
