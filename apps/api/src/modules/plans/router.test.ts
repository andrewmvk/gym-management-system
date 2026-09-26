import { MEMBER_POLICY_IDS } from '@cadence/shared/auth';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, pool } from '@api/db/client';
import { dUsers, fUserPolicyOnUser } from '@api/db/schema';
import { SEED_ADMIN_EMAIL, seedBase } from '@api/db/seed';
import { logger } from '@api/lib/logger';
import { signSessionToken } from '@api/modules/auth/session';
import { resetTestDatabase } from '@api/test/database';
import { appRouter } from '@api/trpc/app-router';
import { createContext } from '@api/trpc/context';
import { createCallerFactory } from '@api/trpc/procedures';

async function createMember() {
  const [user] = await db
    .insert(dUsers)
    .values({ email: 'plan-member@example.com', name: 'Plan Router Member', passwordHash: await bcrypt.hash('password123', 4) })
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

describe('plans router', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });
  afterAll(() => pool.end());

  it('generates today’s plan for a signed-in member', async () => {
    const member = await createMember();
    const caller = await callerFor(signSessionToken(member.id));

    const plan = await caller.plans.generateToday({});

    expect(plan.userId).toBe(member.id);
    expect(plan.exercises.length).toBeGreaterThan(0);
  });

  it('refuses a signed-out caller', async () => {
    const caller = await callerFor();

    await expect(caller.plans.generateToday({})).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('refuses a staff account that has no update_own_plans grant', async () => {
    const [admin] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_ADMIN_EMAIL));
    const caller = await callerFor(signSessionToken(admin!.id));

    await expect(caller.plans.generateToday({})).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
