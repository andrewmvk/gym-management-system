import { db, pool } from '@api/db/client';
import { dUserPolicy, dUsers, fUserPolicyOnUser } from '@api/db/schema';
import { SEED_ADMIN_EMAIL, SEED_TRAINER_EMAIL, seedBase } from '@api/db/seed';
import { logger } from '@api/lib/logger';
import { findActiveGrants } from '@api/modules/auth/repository';
import { SESSION_COOKIE, signSessionToken } from '@api/modules/auth/session';
import { resetTestDatabase } from '@api/test/database';
import { appRouter } from '@api/trpc/app-router';
import { createContext } from '@api/trpc/context';
import { createCallerFactory } from '@api/trpc/procedures';
import {
  defineAbilityFor,
  LOCKOUT_PROTECTED_POLICY_IDS,
  MANAGE_CATALOG,
  MEMBER_POLICY_IDS,
  READ_ALL_PLANS,
  READ_MEMBERS,
} from '@cadence/shared/auth';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const DAY_MS = 24 * 60 * 60 * 1000;

async function callerFor(token?: string) {
  const req = { cookies: token ? { [SESSION_COOKIE]: token } : {}, log: logger };
  const res = { cookie: vi.fn(), clearCookie: vi.fn() };
  const ctx = await createContext({ req, res } as unknown as CreateExpressContextOptions);
  return createCallerFactory(appRouter)(ctx);
}

async function userByEmail(email: string) {
  const [user] = await db.select().from(dUsers).where(eq(dUsers.email, email));
  return user!;
}

async function tokenFor(email: string) {
  return signSessionToken((await userByEmail(email)).id);
}

async function memberToken() {
  const [member] = await db.insert(dUsers).values({ email: 'member@example.com', name: 'Member' }).returning();
  await db
    .insert(fUserPolicyOnUser)
    .values(MEMBER_POLICY_IDS.map((policyId) => ({ userId: member!.id, policyId, effect: 'granted' as const })));
  return signSessionToken(member!.id);
}

async function abilityOf(userId: string) {
  return defineAbilityFor({ id: userId }, await findActiveGrants(userId, new Date()));
}

function inDays(days: number) {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

afterAll(async () => {
  await pool.end();
});

describe('policies', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });

  it('lists every policy and every user with their grants and whether each is active', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    const trainer = await userByEmail(SEED_TRAINER_EMAIL);
    await db
      .update(fUserPolicyOnUser)
      .set({ expiresOn: new Date(Date.now() - DAY_MS) })
      .where(eq(fUserPolicyOnUser.userId, trainer.id));

    const result = await caller.policies.list();

    expect(result.policies).toHaveLength((await db.select().from(dUserPolicy)).length);
    const listedTrainer = result.users.find((user) => user.id === trainer.id);
    expect(listedTrainer?.grants.length).toBeGreaterThan(0);
    expect(listedTrainer?.grants.every((grant) => !grant.isActive)).toBe(true);
    const listedAdmin = result.users.find((user) => user.email === SEED_ADMIN_EMAIL);
    expect(listedAdmin?.grants.every((grant) => grant.isActive)).toBe(true);
  });

  it('grants a policy so the ability appears, and upserts on the composite key', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    const trainer = await userByEmail(SEED_TRAINER_EMAIL);
    expect((await abilityOf(trainer.id)).can('manage', 'Catalog')).toBe(false);

    await caller.policies.grant({ userId: trainer.id, policyId: MANAGE_CATALOG });
    await caller.policies.grant({ userId: trainer.id, policyId: MANAGE_CATALOG, expiresOn: inDays(5) });

    expect((await abilityOf(trainer.id)).can('manage', 'Catalog')).toBe(true);
    const rows = await db.select().from(fUserPolicyOnUser).where(eq(fUserPolicyOnUser.userId, trainer.id));
    expect(rows.filter((row) => row.policyId === MANAGE_CATALOG)).toHaveLength(1);
    expect(rows.find((row) => row.policyId === MANAGE_CATALOG)?.expiresOn).not.toBeNull();
  });

  it('revokes in place by expiring the row, never deleting it', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    const trainer = await userByEmail(SEED_TRAINER_EMAIL);
    const before = await db.select().from(fUserPolicyOnUser).where(eq(fUserPolicyOnUser.userId, trainer.id));
    expect((await abilityOf(trainer.id)).can('read', 'TrainingPlan')).toBe(true);

    await caller.policies.revoke({ userId: trainer.id, policyId: READ_ALL_PLANS });

    expect((await abilityOf(trainer.id)).can('read', 'TrainingPlan')).toBe(false);
    const after = await db.select().from(fUserPolicyOnUser).where(eq(fUserPolicyOnUser.userId, trainer.id));
    expect(after).toHaveLength(before.length);
    expect(after.find((row) => row.policyId === READ_ALL_PLANS)?.expiresOn).not.toBeNull();
  });

  it('extends a revoked grant back to active, with a date or indefinitely', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    const trainer = await userByEmail(SEED_TRAINER_EMAIL);
    await caller.policies.revoke({ userId: trainer.id, policyId: READ_ALL_PLANS });

    await caller.policies.extend({ userId: trainer.id, policyId: READ_ALL_PLANS, expiresOn: inDays(3) });
    expect((await abilityOf(trainer.id)).can('read', 'TrainingPlan')).toBe(true);

    await caller.policies.extend({ userId: trainer.id, policyId: READ_ALL_PLANS, expiresOn: null });
    const [row] = await db
      .select()
      .from(fUserPolicyOnUser)
      .where(eq(fUserPolicyOnUser.userId, trainer.id))
      .then((rows) => rows.filter((item) => item.policyId === READ_ALL_PLANS));
    expect(row?.expiresOn).toBeNull();
  });

  it('lets a denied override win over a granted policy', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    const trainer = await userByEmail(SEED_TRAINER_EMAIL);

    await caller.policies.grant({ userId: trainer.id, policyId: READ_ALL_PLANS, effect: 'denied' });

    expect((await abilityOf(trainer.id)).cannot('read', 'TrainingPlan')).toBe(true);
  });

  it('rejects a past expiry, unknown users and policies, and extending or revoking a grant that does not exist', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    const trainer = await userByEmail(SEED_TRAINER_EMAIL);

    await expect(
      caller.policies.grant({ userId: trainer.id, policyId: READ_MEMBERS, expiresOn: inDays(-1) }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(caller.policies.grant({ userId: crypto.randomUUID(), policyId: READ_MEMBERS })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(caller.policies.grant({ userId: trainer.id, policyId: 'nope' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(caller.policies.revoke({ userId: trainer.id, policyId: READ_MEMBERS })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(
      caller.policies.extend({ userId: trainer.id, policyId: READ_MEMBERS, expiresOn: null }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('refuses to let an admin revoke or deny their own staff or policy-management access', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    const admin = await userByEmail(SEED_ADMIN_EMAIL);

    for (const policyId of LOCKOUT_PROTECTED_POLICY_IDS) {
      await expect(caller.policies.revoke({ userId: admin.id, policyId })).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
      await expect(caller.policies.grant({ userId: admin.id, policyId, effect: 'denied' })).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    }

    const ability = await abilityOf(admin.id);
    expect(ability.can('manage', 'UserPolicyAssignment')).toBe(true);
    expect(ability.can('read', 'StaffApp')).toBe(true);
    await caller.policies.revoke({ userId: admin.id, policyId: MANAGE_CATALOG });
    expect((await abilityOf(admin.id)).can('manage', 'Catalog')).toBe(false);
  });

  it('never creates a user', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    const trainer = await userByEmail(SEED_TRAINER_EMAIL);
    const usersBefore = await db.select().from(dUsers);

    await caller.policies.grant({ userId: trainer.id, policyId: READ_MEMBERS });
    await caller.policies.revoke({ userId: trainer.id, policyId: READ_MEMBERS });
    await expect(caller.policies.grant({ userId: crypto.randomUUID(), policyId: READ_MEMBERS })).rejects.toThrow();

    expect(await db.select().from(dUsers)).toHaveLength(usersBefore.length);
  });

  it('answers FORBIDDEN to a trainer and a member on every procedure, and UNAUTHORIZED when signed out', async () => {
    const admin = await userByEmail(SEED_ADMIN_EMAIL);
    const target = { userId: admin.id, policyId: READ_MEMBERS };
    const grantsBefore = await db.select().from(fUserPolicyOnUser);

    for (const token of [await tokenFor(SEED_TRAINER_EMAIL), await memberToken()]) {
      const caller = await callerFor(token);
      await expect(caller.policies.list()).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(caller.policies.grant(target)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(caller.policies.revoke(target)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(caller.policies.extend({ ...target, expiresOn: null })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    }

    await expect((await callerFor()).policies.list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    const grantsAfter = await db.select().from(fUserPolicyOnUser);
    expect(grantsAfter.length).toBe(grantsBefore.length + MEMBER_POLICY_IDS.length);
  });
});
