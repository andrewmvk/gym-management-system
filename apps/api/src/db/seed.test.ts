import { db, pool } from '@api/db/client';
import {
  dUserPolicy,
  dUserPolicyGroup,
  dUserPolicyGroupPolicy,
  dUsers,
  fUserPolicyGroupOnUser,
  fUserPolicyOnUser,
} from '@api/db/schema';
import { SEED_ADMIN_EMAIL, SEED_STUDENT_EMAIL, SEED_TRAINER_EMAIL, seedBase } from '@api/db/seed';
import { FACE_EMBEDDING_LENGTH } from '@api/lib/face-embedding';
import { DEFAULT_MEMBERSHIP_PLAN } from '@api/modules/auth/service';
import { resetTestDatabase } from '@api/test/database';
import {
  ADMIN_GROUP,
  ADMIN_POLICY_IDS,
  MEMBER_GROUP,
  MEMBER_POLICY_IDS,
  POLICY_CATALOG,
  POLICY_GROUP_CATALOG,
  READ_MEMBER_APP,
  TRAINER_GROUP,
  TRAINER_POLICY_IDS,
} from '@cadence/shared/auth';
import { and, count, eq, ne } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

async function rowCounts() {
  const [[policies], [users], [grants], [groups], [groupPolicies], [memberships]] = await Promise.all([
    db.select({ value: count() }).from(dUserPolicy),
    db.select({ value: count() }).from(dUsers),
    db.select({ value: count() }).from(fUserPolicyOnUser),
    db.select({ value: count() }).from(dUserPolicyGroup),
    db.select({ value: count() }).from(dUserPolicyGroupPolicy),
    db.select({ value: count() }).from(fUserPolicyGroupOnUser),
  ]);
  return {
    policies: policies!.value,
    users: users!.value,
    grants: grants!.value,
    groups: groups!.value,
    groupPolicies: groupPolicies!.value,
    memberships: memberships!.value,
  };
}

async function groupIdsOf(email: string) {
  const rows = await db
    .select({ groupId: fUserPolicyGroupOnUser.groupId })
    .from(fUserPolicyGroupOnUser)
    .innerJoin(dUsers, eq(dUsers.id, fUserPolicyGroupOnUser.userId))
    .where(eq(dUsers.email, email));
  return rows.map((row) => row.groupId).sort();
}

async function policyIdsOfGroup(groupId: string) {
  const rows = await db
    .select({ policyId: dUserPolicyGroupPolicy.policyId })
    .from(dUserPolicyGroupPolicy)
    .where(eq(dUserPolicyGroupPolicy.groupId, groupId));
  return rows.map((row) => row.policyId).sort();
}

describe('seedBase', () => {
  beforeEach(resetTestDatabase);
  afterAll(() => pool.end());

  it('is idempotent', async () => {
    await seedBase();
    const first = await rowCounts();
    await seedBase();

    expect(await rowCounts()).toEqual(first);
    expect(first).toEqual({
      policies: POLICY_CATALOG.length,
      users: 3,
      grants: 0,
      groups: POLICY_GROUP_CATALOG.length,
      groupPolicies: MEMBER_POLICY_IDS.length + TRAINER_POLICY_IDS.length + ADMIN_POLICY_IDS.length,
      memberships: 3,
    });
  });

  it('seeds each group with exactly its designated policies', async () => {
    await seedBase();

    expect(await policyIdsOfGroup(MEMBER_GROUP)).toEqual([...MEMBER_POLICY_IDS].sort());
    expect(await policyIdsOfGroup(TRAINER_GROUP)).toEqual([...TRAINER_POLICY_IDS].sort());
    expect(await policyIdsOfGroup(ADMIN_GROUP)).toEqual([...ADMIN_POLICY_IDS].sort());
    const groups = await db.select().from(dUserPolicyGroup);
    expect(groups.every((group) => group.description.length > 0)).toBe(true);
  });

  it('puts each staff account in its own group, and in no member group', async () => {
    await seedBase();

    expect(await groupIdsOf(SEED_TRAINER_EMAIL)).toEqual([TRAINER_GROUP]);
    expect(await groupIdsOf(SEED_ADMIN_EMAIL)).toEqual([ADMIN_GROUP]);

    const adminOnly = ADMIN_POLICY_IDS.filter((id) => !(TRAINER_POLICY_IDS as readonly string[]).includes(id));
    expect((await policyIdsOfGroup(TRAINER_GROUP)).some((id) => (adminOnly as readonly string[]).includes(id))).toBe(
      false,
    );

    const memberOnly = MEMBER_POLICY_IDS.filter(
      (id) => ![...TRAINER_POLICY_IDS, ...ADMIN_POLICY_IDS].some((staffId) => staffId === id),
    );
    expect(memberOnly).toContain(READ_MEMBER_APP);
    for (const groupId of [TRAINER_GROUP, ADMIN_GROUP]) {
      expect((await policyIdsOfGroup(groupId)).some((id) => (memberOnly as readonly string[]).includes(id))).toBe(
        false,
      );
    }
  });

  it('leaves member-only fields null on staff accounts', async () => {
    await seedBase();

    const staff = await db.select().from(dUsers).where(ne(dUsers.email, SEED_STUDENT_EMAIL));
    expect(staff).toHaveLength(2);
    for (const user of staff) {
      expect(user.passwordHash).toBeTruthy();
      expect(user).toMatchObject({
        birthdate: null,
        referencePhotoPath: null,
        referenceFaceEmbedding: null,
        aptitudeStatus: null,
        membershipStatus: null,
        membershipPlan: null,
      });
    }
  });

  it('seeds an activated demo member with a photo and an embedding, in the member group only', async () => {
    await seedBase();

    const [student] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_STUDENT_EMAIL));
    expect(student).toMatchObject({
      aptitudeStatus: 'cleared',
      membershipStatus: 'active',
      membershipPlan: DEFAULT_MEMBERSHIP_PLAN,
    });
    expect(student?.passwordHash).toBeTruthy();
    expect(student?.referenceFaceEmbedding).toHaveLength(FACE_EMBEDDING_LENGTH);
    expect(student?.referencePhotoPath).toMatch(new RegExp(`^${student?.id}/reference_photo/.+\\.jpg$`));
    expect(await groupIdsOf(SEED_STUDENT_EMAIL)).toEqual([MEMBER_GROUP]);
  });

  it('keeps the demo member photo as it was when re-run', async () => {
    await seedBase();
    const [first] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_STUDENT_EMAIL));
    await seedBase();
    const [second] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_STUDENT_EMAIL));

    expect(second?.referencePhotoPath).toBe(first?.referencePhotoPath);
  });

  it('keeps later changes to a staff membership when re-run', async () => {
    await seedBase();
    const [admin] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_ADMIN_EMAIL));
    const endedAt = new Date('2020-01-01T00:00:00Z');
    await db
      .update(fUserPolicyGroupOnUser)
      .set({ expiresOn: endedAt })
      .where(and(eq(fUserPolicyGroupOnUser.userId, admin!.id), eq(fUserPolicyGroupOnUser.groupId, ADMIN_GROUP)));

    await seedBase();

    const [membership] = await db
      .select()
      .from(fUserPolicyGroupOnUser)
      .where(eq(fUserPolicyGroupOnUser.userId, admin!.id));
    expect(membership?.expiresOn).toEqual(endedAt);
  });

  it('re-asserts a group policy list on every run, restoring a missing policy and dropping an extra one', async () => {
    await seedBase();
    await db
      .delete(dUserPolicyGroupPolicy)
      .where(
        and(eq(dUserPolicyGroupPolicy.groupId, ADMIN_GROUP), eq(dUserPolicyGroupPolicy.policyId, 'manage_catalog')),
      );
    await db.insert(dUserPolicyGroupPolicy).values({ groupId: ADMIN_GROUP, policyId: READ_MEMBER_APP });

    await seedBase();

    expect(await policyIdsOfGroup(ADMIN_GROUP)).toEqual([...ADMIN_POLICY_IDS].sort());
  });
});
