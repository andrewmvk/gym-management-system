import type { PolicyId } from '@cadence/shared/auth';
import { and, eq, gt, isNull, or } from 'drizzle-orm';
import { db, type DatabaseExecutor } from '@api/db/client';
import { dUserPolicy, dUsers, fUserPolicyOnUser } from '@api/db/schema';

export async function findUserByEmail(email: string, executor: DatabaseExecutor = db) {
  const [user] = await executor.select().from(dUsers).where(eq(dUsers.email, email));
  return user ?? null;
}

export async function findUserById(id: string, executor: DatabaseExecutor = db) {
  const [user] = await executor.select().from(dUsers).where(eq(dUsers.id, id));
  return user ?? null;
}

// FR-9: turns a cleared applicant into a member. Called inside a transaction alongside grantPolicies
// so the row update and the policy grants either both land or neither does.
export async function activateMember(
  id: string,
  input: { passwordHash: string; membershipPlan: string },
  executor: DatabaseExecutor = db,
) {
  const [user] = await executor
    .update(dUsers)
    .set({ passwordHash: input.passwordHash, membershipStatus: 'active', membershipPlan: input.membershipPlan })
    .where(eq(dUsers.id, id))
    .returning();
  return user!;
}

export async function grantPolicies(userId: string, policyIds: readonly PolicyId[], executor: DatabaseExecutor = db) {
  await executor
    .insert(fUserPolicyOnUser)
    .values(policyIds.map((policyId) => ({ userId, policyId, effect: 'granted' as const })))
    .onConflictDoNothing();
}

export function findActiveGrants(userId: string, now: Date, executor: DatabaseExecutor = db) {
  return executor
    .select({
      operation: dUserPolicy.operation,
      resource: dUserPolicy.resource,
      scope: dUserPolicy.scope,
      effect: fUserPolicyOnUser.effect,
      expiresOn: fUserPolicyOnUser.expiresOn,
    })
    .from(fUserPolicyOnUser)
    .innerJoin(dUserPolicy, eq(dUserPolicy.id, fUserPolicyOnUser.policyId))
    .where(
      and(
        eq(fUserPolicyOnUser.userId, userId),
        or(isNull(fUserPolicyOnUser.expiresOn), gt(fUserPolicyOnUser.expiresOn, now)),
      ),
    );
}
