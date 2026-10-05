import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '@api/app';
import { env } from '@api/config/env';
import { db, pool } from '@api/db/client';
import { dUsers, fUserPolicyOnUser } from '@api/db/schema';
import { seedBase } from '@api/db/seed';
import { SESSION_COOKIE, signSessionToken } from '@api/modules/auth/session';
import { resetTestDatabase } from '@api/test/database';
import type { AppRouter } from '@api/trpc/app-router';
import { MEMBER_POLICY_IDS } from '@cadence/shared/auth';
import { createTRPCClient, httpBatchStreamLink } from '@trpc/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createApp(env).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

async function memberClient() {
  const [user] = await db
    .insert(dUsers)
    .values({ email: 'stream-member@example.com', name: 'Stream Member' })
    .returning();
  await db
    .insert(fUserPolicyOnUser)
    .values(MEMBER_POLICY_IDS.map((policyId) => ({ userId: user!.id, policyId, effect: 'granted' as const })));
  const cookie = `${SESSION_COOKIE}=${signSessionToken(user!.id)}`;
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchStreamLink({
        url: `${baseUrl}/trpc`,
        headers: { cookie },
      }),
    ],
  });
}

// What the web app's client does: the stream link over the real Express adapter, so this is the one test that
// proves a yielding procedure reaches the browser event by event instead of as one buffered answer.
describe('streaming procedures over HTTP', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });

  it('streams the plan exercises and then the saved plan', async () => {
    const client = await memberClient();

    const events = [];
    for await (const event of await client.plans.generateToday.mutate({})) events.push(event);

    expect(events.length).toBeGreaterThan(1);
    expect(events.slice(0, -1).every((event) => event.type === 'exercise')).toBe(true);
    expect(events.at(-1)).toMatchObject({ type: 'done', result: { status: 'ok' } });
  });

  it('streams the coach reply as text and ends cleanly', async () => {
    const client = await memberClient();

    const events = [];
    for await (const event of await client.chat.send.mutate({ message: 'How is my plan?', mentions: [] })) {
      events.push(event);
    }

    expect(events.some((event) => event.type === 'text' && event.delta.length > 0)).toBe(true);
    expect(events.some((event) => event.type === 'block' && event.block.type === 'quick_replies')).toBe(true);
  });

  it('still answers an ordinary query through the same link', async () => {
    const client = await memberClient();

    expect(await client.plans.getToday.query()).toBeNull();
  });
});
