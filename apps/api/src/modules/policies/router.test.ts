import { db, pool } from '@api/db/client';
import {
  dUserPolicyGroup,
  dUserPolicyGroupPolicy,
  dUsers,
  fUserPolicyGroupOnUser,
  fUserPolicyOnUser,
} from '@api/db/schema';
import { SEED_ADMIN_EMAIL, SEED_TRAINER_EMAIL, seedBase } from '@api/db/seed';
import { logger } from '@api/lib/logger';
import { findActiveGrants } from '@api/modules/auth/repository';
import { SESSION_COOKIE, signSessionToken } from '@api/modules/auth/session';
import { resetTestDatabase } from '@api/test/database';
import { appRouter } from '@api/trpc/app-router';
import { createContext } from '@api/trpc/context';
import { createCallerFactory } from '@api/trpc/procedures';
import {
  ADMIN_GROUP,
  defineAbilityFor,
  LOCKOUT_PROTECTED_POLICY_IDS,
  MANAGE_CATALOG,
  MANAGE_POLICY_ASSIGNMENTS,
  MEMBER_GROUP,
  MEMBER_POLICY_IDS,
  READ_ALL_PLANS,
  READ_MEMBERS,
  READ_STAFF_APP,
  TRAINER_GROUP,
  UPDATE_ALL_PLANS,
} from '@cadence/shared/auth';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { and, eq } from 'drizzle-orm';
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

async function createUser(email: string) {
  const [user] = await db.insert(dUsers).values({ email, name: email }).returning();
  return user!;
}

async function memberToken() {
  const member = await createUser('member@example.com');
  await db.insert(fUserPolicyGroupOnUser).values({ userId: member.id, groupId: MEMBER_GROUP });
  return signSessionToken(member.id);
}

async function abilityOf(userId: string) {
  return defineAbilityFor({ id: userId }, await findActiveGrants(userId, new Date()));
}

function inDays(days: number) {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

async function membershipOf(userId: string, groupId: string) {
  const [row] = await db
    .select()
    .from(fUserPolicyGroupOnUser)
    .where(and(eq(fUserPolicyGroupOnUser.userId, userId), eq(fUserPolicyGroupOnUser.groupId, groupId)));
  return row;
}

afterAll(async () => {
  await pool.end();
});

describe('policies', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });

  it('lists the policies, the groups with their policies, and every user with groups, grants and where each policy comes from', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    const trainer = await userByEmail(SEED_TRAINER_EMAIL);
    await caller.policies.grant({ userId: trainer.id, policyId: MANAGE_CATALOG });
    await caller.policies.grant({ userId: trainer.id, policyId: READ_ALL_PLANS, effect: 'denied' });

    const result = await caller.policies.list();

    expect(result.groups.map((group) => group.id)).toEqual([ADMIN_GROUP, MEMBER_GROUP, TRAINER_GROUP]);
    expect(result.groups.find((group) => group.id === TRAINER_GROUP)?.policyIds).toContain(READ_ALL_PLANS);
    const listed = result.users.find((user) => user.id === trainer.id)!;
    expect(listed.groups).toEqual([{ groupId: TRAINER_GROUP, expiresOn: null, isActive: true }]);
    expect(listed.grants.map((grant) => [grant.policyId, grant.effect, grant.isActive]).sort()).toEqual([
      [MANAGE_CATALOG, 'granted', true],
      [READ_ALL_PLANS, 'denied', true],
    ]);
    const effective = new Map(listed.effective.map((item) => [item.policyId, item]));
    expect(effective.get(MANAGE_CATALOG)).toMatchObject({ sources: ['direct'], isDenied: false });
    expect(effective.get(UPDATE_ALL_PLANS)).toMatchObject({ sources: [TRAINER_GROUP], isDenied: false });
    expect(effective.get(READ_ALL_PLANS)).toMatchObject({ sources: [TRAINER_GROUP], isDenied: true });
  });

  it('shows an ended membership as inactive and no longer supplies its policies', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    const trainer = await userByEmail(SEED_TRAINER_EMAIL);
    await db
      .update(fUserPolicyGroupOnUser)
      .set({ expiresOn: new Date(Date.now() - DAY_MS) })
      .where(eq(fUserPolicyGroupOnUser.userId, trainer.id));

    const listed = (await caller.policies.list()).users.find((user) => user.id === trainer.id)!;

    expect(listed.groups).toMatchObject([{ groupId: TRAINER_GROUP, isActive: false }]);
    expect(listed.effective).toEqual([]);
    expect((await abilityOf(trainer.id)).can('read', 'StaffApp')).toBe(false);
  });

  it('grants a policy directly so the ability appears, and upserts on the composite key', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    const trainer = await userByEmail(SEED_TRAINER_EMAIL);
    expect((await abilityOf(trainer.id)).can('manage', 'Catalog')).toBe(false);

    await caller.policies.grant({ userId: trainer.id, policyId: MANAGE_CATALOG });
    await caller.policies.grant({ userId: trainer.id, policyId: MANAGE_CATALOG, expiresOn: inDays(5) });

    expect((await abilityOf(trainer.id)).can('manage', 'Catalog')).toBe(true);
    const rows = await db.select().from(fUserPolicyOnUser).where(eq(fUserPolicyOnUser.userId, trainer.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.expiresOn).not.toBeNull();
  });

  it('revokes a direct grant in place by expiring the row, never deleting it, and extends it back', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    const trainer = await userByEmail(SEED_TRAINER_EMAIL);
    await caller.policies.grant({ userId: trainer.id, policyId: MANAGE_CATALOG });

    await caller.policies.revoke({ userId: trainer.id, policyId: MANAGE_CATALOG });

    expect((await abilityOf(trainer.id)).can('manage', 'Catalog')).toBe(false);
    const rows = await db.select().from(fUserPolicyOnUser).where(eq(fUserPolicyOnUser.userId, trainer.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.expiresOn).not.toBeNull();

    await caller.policies.extend({ userId: trainer.id, policyId: MANAGE_CATALOG, expiresOn: inDays(3) });
    expect((await abilityOf(trainer.id)).can('manage', 'Catalog')).toBe(true);

    await caller.policies.extend({ userId: trainer.id, policyId: MANAGE_CATALOG, expiresOn: null });
    const [row] = await db.select().from(fUserPolicyOnUser).where(eq(fUserPolicyOnUser.userId, trainer.id));
    expect(row?.expiresOn).toBeNull();
  });

  it('cannot revoke a policy that only a group supplies, but a direct denial overrides it and the rest of the group stays', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    const trainer = await userByEmail(SEED_TRAINER_EMAIL);

    await expect(caller.policies.revoke({ userId: trainer.id, policyId: READ_ALL_PLANS })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });

    await caller.policies.grant({ userId: trainer.id, policyId: READ_ALL_PLANS, effect: 'denied' });

    const ability = await abilityOf(trainer.id);
    expect(ability.cannot('read', 'TrainingPlan')).toBe(true);
    expect(ability.can('update', 'TrainingPlan')).toBe(true);
    expect(ability.can('read', 'StaffApp')).toBe(true);
  });

  it('assigns, revokes in place, and extends a group so the effective ability follows', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    const member = await createUser('plain@example.com');
    expect((await abilityOf(member.id)).can('read', 'StaffApp')).toBe(false);

    await caller.policies.assignGroup({ userId: member.id, groupId: TRAINER_GROUP });
    await caller.policies.assignGroup({ userId: member.id, groupId: TRAINER_GROUP, expiresOn: inDays(5) });
    expect((await abilityOf(member.id)).can('read', 'StaffApp')).toBe(true);
    expect((await membershipOf(member.id, TRAINER_GROUP))?.expiresOn).not.toBeNull();

    await caller.policies.revokeGroup({ userId: member.id, groupId: TRAINER_GROUP });
    expect((await abilityOf(member.id)).can('read', 'StaffApp')).toBe(false);
    expect(await membershipOf(member.id, TRAINER_GROUP)).toBeDefined();

    await caller.policies.extendGroup({ userId: member.id, groupId: TRAINER_GROUP, expiresOn: inDays(2) });
    expect((await abilityOf(member.id)).can('read', 'StaffApp')).toBe(true);

    await caller.policies.extendGroup({ userId: member.id, groupId: TRAINER_GROUP, expiresOn: null });
    expect((await membershipOf(member.id, TRAINER_GROUP))?.expiresOn).toBeNull();
  });

  it('unions several groups, and a direct denial wins over a policy two groups supply', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    const user = await createUser('both@example.com');
    await caller.policies.assignGroup({ userId: user.id, groupId: TRAINER_GROUP });
    await caller.policies.assignGroup({ userId: user.id, groupId: ADMIN_GROUP });

    const ability = await abilityOf(user.id);
    expect(ability.can('manage', 'PlanReview')).toBe(true);
    expect(ability.can('manage', 'Catalog')).toBe(true);

    await caller.policies.grant({ userId: user.id, policyId: READ_ALL_PLANS, effect: 'denied' });
    expect((await abilityOf(user.id)).cannot('read', 'TrainingPlan')).toBe(true);
  });

  it('changing a group policy list reaches the next ability of an existing member', async () => {
    const trainer = await userByEmail(SEED_TRAINER_EMAIL);
    expect((await abilityOf(trainer.id)).can('manage', 'Catalog')).toBe(false);

    await db.insert(dUserPolicyGroupPolicy).values({ groupId: TRAINER_GROUP, policyId: MANAGE_CATALOG });

    expect((await abilityOf(trainer.id)).can('manage', 'Catalog')).toBe(true);
  });

  it('rejects a past expiry, unknown users, policies and groups, and revoking or extending what is not held', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    const trainer = await userByEmail(SEED_TRAINER_EMAIL);
    const unknownUser = crypto.randomUUID();

    await expect(
      caller.policies.grant({ userId: trainer.id, policyId: READ_MEMBERS, expiresOn: inDays(-1) }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(
      caller.policies.assignGroup({ userId: trainer.id, groupId: ADMIN_GROUP, expiresOn: inDays(-1) }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(caller.policies.grant({ userId: unknownUser, policyId: READ_MEMBERS })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(caller.policies.grant({ userId: trainer.id, policyId: 'nope' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(caller.policies.assignGroup({ userId: unknownUser, groupId: ADMIN_GROUP })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(caller.policies.assignGroup({ userId: trainer.id, groupId: 'nope' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(caller.policies.revokeGroup({ userId: trainer.id, groupId: ADMIN_GROUP })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(
      caller.policies.extendGroup({ userId: trainer.id, groupId: ADMIN_GROUP, expiresOn: null }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      caller.policies.extend({ userId: trainer.id, policyId: READ_MEMBERS, expiresOn: null }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('refuses an admin removing their own access by denying it, or by ending the only group that supplies it', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    const admin = await userByEmail(SEED_ADMIN_EMAIL);

    for (const policyId of LOCKOUT_PROTECTED_POLICY_IDS) {
      await expect(caller.policies.grant({ userId: admin.id, policyId, effect: 'denied' })).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    }
    await expect(caller.policies.revokeGroup({ userId: admin.id, groupId: ADMIN_GROUP })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });

    const ability = await abilityOf(admin.id);
    expect(ability.can('manage', 'UserPolicyAssignment')).toBe(true);
    expect(ability.can('read', 'StaffApp')).toBe(true);
    expect((await membershipOf(admin.id, ADMIN_GROUP))?.expiresOn).toBeNull();
    const denials = await db.select().from(fUserPolicyOnUser).where(eq(fUserPolicyOnUser.userId, admin.id));
    expect(denials).toHaveLength(0);
  });

  it('allows an admin to drop a redundant source of their own access, and to change another admin', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    const admin = await userByEmail(SEED_ADMIN_EMAIL);
    await caller.policies.grant({ userId: admin.id, policyId: MANAGE_POLICY_ASSIGNMENTS });

    await caller.policies.revoke({ userId: admin.id, policyId: MANAGE_POLICY_ASSIGNMENTS });
    expect((await abilityOf(admin.id)).can('manage', 'UserPolicyAssignment')).toBe(true);

    const other = await createUser('other-admin@example.com');
    await caller.policies.assignGroup({ userId: other.id, groupId: ADMIN_GROUP });
    await caller.policies.revokeGroup({ userId: other.id, groupId: ADMIN_GROUP });
    expect((await abilityOf(other.id)).can('manage', 'UserPolicyAssignment')).toBe(false);
  });

  it('refuses revoking the only direct source of your own access when no group supplies it', async () => {
    const [user] = await db.insert(dUsers).values({ email: 'direct-admin@example.com', name: 'Direct' }).returning();
    await db.insert(fUserPolicyOnUser).values(
      [READ_STAFF_APP, MANAGE_POLICY_ASSIGNMENTS].map((policyId) => ({
        userId: user!.id,
        policyId,
        effect: 'granted' as const,
      })),
    );
    const caller = await callerFor(await signSessionToken(user!.id));

    await expect(
      caller.policies.revoke({ userId: user!.id, policyId: MANAGE_POLICY_ASSIGNMENTS }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    expect((await abilityOf(user!.id)).can('manage', 'UserPolicyAssignment')).toBe(true);
  });

  it('never creates a user or edits a group', async () => {
    const caller = await callerFor(await tokenFor(SEED_ADMIN_EMAIL));
    const trainer = await userByEmail(SEED_TRAINER_EMAIL);
    const usersBefore = await db.select().from(dUsers);
    const groupsBefore = await db.select().from(dUserPolicyGroup);
    const bridgeBefore = await db.select().from(dUserPolicyGroupPolicy);

    await caller.policies.grant({ userId: trainer.id, policyId: READ_MEMBERS });
    await caller.policies.revoke({ userId: trainer.id, policyId: READ_MEMBERS });
    await caller.policies.assignGroup({ userId: trainer.id, groupId: MEMBER_GROUP });
    await caller.policies.revokeGroup({ userId: trainer.id, groupId: MEMBER_GROUP });
    await expect(caller.policies.grant({ userId: crypto.randomUUID(), policyId: READ_MEMBERS })).rejects.toThrow();
    await expect(caller.policies.assignGroup({ userId: crypto.randomUUID(), groupId: MEMBER_GROUP })).rejects.toThrow();

    expect(await db.select().from(dUsers)).toHaveLength(usersBefore.length);
    expect(await db.select().from(dUserPolicyGroup)).toEqual(groupsBefore);
    expect(await db.select().from(dUserPolicyGroupPolicy)).toEqual(bridgeBefore);
  });

  it('answers FORBIDDEN to a trainer and a member on every procedure, and UNAUTHORIZED when signed out', async () => {
    const admin = await userByEmail(SEED_ADMIN_EMAIL);
    const target = { userId: admin.id, policyId: READ_MEMBERS };
    const groupTarget = { userId: admin.id, groupId: MEMBER_GROUP };
    const grantsBefore = await db.select().from(fUserPolicyOnUser);
    const membershipsBefore = await db.select().from(fUserPolicyGroupOnUser);

    for (const token of [await tokenFor(SEED_TRAINER_EMAIL), await memberToken()]) {
      const caller = await callerFor(token);
      await expect(caller.policies.list()).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(caller.policies.grant(target)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(caller.policies.revoke(target)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(caller.policies.extend({ ...target, expiresOn: null })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
      await expect(caller.policies.assignGroup(groupTarget)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(caller.policies.revokeGroup(groupTarget)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(caller.policies.extendGroup({ ...groupTarget, expiresOn: null })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    }

    await expect((await callerFor()).policies.list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(await db.select().from(fUserPolicyOnUser)).toEqual(grantsBefore);
    expect(await db.select().from(fUserPolicyGroupOnUser)).toHaveLength(membershipsBefore.length + 1);
  });

  it('keeps the member group size consistent with MEMBER_POLICY_IDS', async () => {
    const member = await createUser('sized@example.com');
    await db.insert(fUserPolicyGroupOnUser).values({ userId: member.id, groupId: MEMBER_GROUP });

    expect(await findActiveGrants(member.id, new Date())).toHaveLength(MEMBER_POLICY_IDS.length);
  });
});
