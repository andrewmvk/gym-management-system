import {
  ADMIN_POLICY_IDS,
  MEMBER_POLICY_IDS,
  POLICY_CATALOG,
  READ_MEMBER_APP,
  TRAINER_POLICY_IDS,
} from '@cadence/shared/auth';
import { count, eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, pool } from '@api/db/client';
import { dUserPolicy, dUsers, fUserPolicyOnUser } from '@api/db/schema';
import { SEED_ADMIN_EMAIL, SEED_TRAINER_EMAIL, seedBase } from '@api/db/seed';
import { resetTestDatabase } from '@api/test/database';

async function rowCounts() {
  const [[policies], [users], [grants]] = await Promise.all([
    db.select({ value: count() }).from(dUserPolicy),
    db.select({ value: count() }).from(dUsers),
    db.select({ value: count() }).from(fUserPolicyOnUser),
  ]);
  return { policies: policies!.value, users: users!.value, grants: grants!.value };
}

async function policyIdsOf(email: string) {
  const rows = await db
    .select({ policyId: fUserPolicyOnUser.policyId })
    .from(fUserPolicyOnUser)
    .innerJoin(dUsers, eq(dUsers.id, fUserPolicyOnUser.userId))
    .where(eq(dUsers.email, email));
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
      users: 2,
      grants: TRAINER_POLICY_IDS.length + ADMIN_POLICY_IDS.length,
    });
  });

  it('grants each staff account exactly its designated policies', async () => {
    await seedBase();

    const trainerPolicies = await policyIdsOf(SEED_TRAINER_EMAIL);
    const adminPolicies = await policyIdsOf(SEED_ADMIN_EMAIL);

    expect(trainerPolicies).toEqual([...TRAINER_POLICY_IDS].sort());
    expect(adminPolicies).toEqual([...ADMIN_POLICY_IDS].sort());

    const adminOnly = ADMIN_POLICY_IDS.filter((id) => !(TRAINER_POLICY_IDS as readonly string[]).includes(id));
    expect(trainerPolicies.some((id) => (adminOnly as readonly string[]).includes(id))).toBe(false);

    const memberOnly = MEMBER_POLICY_IDS.filter(
      (id) => ![...TRAINER_POLICY_IDS, ...ADMIN_POLICY_IDS].some((staffId) => staffId === id),
    );
    expect(memberOnly).toContain(READ_MEMBER_APP);
    for (const policies of [trainerPolicies, adminPolicies]) {
      expect(policies.some((id) => (memberOnly as readonly string[]).includes(id))).toBe(false);
    }
  });

  it('leaves member-only fields null on staff accounts', async () => {
    await seedBase();

    const staff = await db.select().from(dUsers);
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

  it('keeps later changes to a staff grant when re-run', async () => {
    await seedBase();
    const [admin] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_ADMIN_EMAIL));
    await db
      .update(fUserPolicyOnUser)
      .set({ effect: 'denied' })
      .where(eq(fUserPolicyOnUser.userId, admin!.id));

    await seedBase();

    const effects = await db
      .select({ effect: fUserPolicyOnUser.effect })
      .from(fUserPolicyOnUser)
      .where(eq(fUserPolicyOnUser.userId, admin!.id));
    expect(effects.every((row) => row.effect === 'denied')).toBe(true);
  });
});
