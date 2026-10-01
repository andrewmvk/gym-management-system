import { db, pool } from '@api/db/client';
import { dUsers, fUserPolicyOnUser } from '@api/db/schema';
import { SEED_ADMIN_EMAIL, seedBase } from '@api/db/seed';
import { logger } from '@api/lib/logger';
import { signSessionToken } from '@api/modules/auth/session';
import { resetTestDatabase } from '@api/test/database';
import { appRouter } from '@api/trpc/app-router';
import { createContext } from '@api/trpc/context';
import { createCallerFactory } from '@api/trpc/procedures';
import { MEMBER_POLICY_IDS } from '@cadence/shared/auth';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

async function createMember(email = 'chat-router-member@example.com') {
  const [user] = await db
    .insert(dUsers)
    .values({ email, name: 'Chat Router Member', passwordHash: await bcrypt.hash('password123', 4) })
    .returning();
  await db
    .insert(fUserPolicyOnUser)
    .values(MEMBER_POLICY_IDS.map((policyId) => ({ userId: user!.id, policyId, effect: 'granted' as const })));
  return user!;
}

async function callerFor(token?: string) {
  const req = { cookies: token ? { cadence_session: token } : {}, log: logger };
  const res = { cookie: () => {}, clearCookie: () => {} };
  const ctx = await createContext({ req, res } as never);
  return createCallerFactory(appRouter)(ctx);
}

describe('chat router', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });
  afterAll(() => pool.end());

  it('refuses a signed-out caller', async () => {
    const caller = await callerFor();

    await expect(caller.chat.send({ message: 'hello' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('refuses a staff account that has no use_chat grant', async () => {
    const [admin] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_ADMIN_EMAIL));
    const caller = await callerFor(signSessionToken(admin!.id));

    await expect(caller.chat.send({ message: 'hello' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('refuses a message over 2000 characters', async () => {
    const member = await createMember();
    const caller = await callerFor(signSessionToken(member.id));

    await expect(caller.chat.send({ message: 'a'.repeat(2001) })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('lets a member send a message and get a reply', async () => {
    const member = await createMember();
    const caller = await callerFor(signSessionToken(member.id));

    const result = await caller.chat.send({ message: 'Hi, how is my plan looking?' });

    expect(result.reply).toEqual(expect.any(String));
    expect(result.factsSaved).toBe(0);
  });

  describe('adjustPlan', () => {
    it('refuses a signed-out caller', async () => {
      const caller = await callerFor();

      await expect(caller.chat.adjustPlan({ date: '2026-10-01', instruction: 'skip legs' })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('refuses a staff account that has no update_own_plans grant', async () => {
      const [admin] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_ADMIN_EMAIL));
      const caller = await callerFor(signSessionToken(admin!.id));

      await expect(caller.chat.adjustPlan({ date: '2026-10-01', instruction: 'skip legs' })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    });

    it('rejects an invalid date', async () => {
      const member = await createMember();
      const caller = await callerFor(signSessionToken(member.id));

      await expect(caller.chat.adjustPlan({ date: 'not-a-date', instruction: 'skip legs' })).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });

    it('lets a member regenerate a future plan', async () => {
      const member = await createMember();
      const caller = await callerFor(signSessionToken(member.id));

      const result = await caller.chat.adjustPlan({ date: '2026-12-25', instruction: 'make it easier' });

      expect(result).toMatchObject({ status: 'ok' });
    });
  });
});
