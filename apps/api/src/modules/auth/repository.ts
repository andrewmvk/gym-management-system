import { type DatabaseExecutor, db } from '@api/db/client';
import { dUserPolicy, dUserPolicyGroupPolicy, dUsers, fUserPolicyGroupOnUser, fUserPolicyOnUser } from '@api/db/schema';
import type { PolicyGroupId } from '@cadence/shared/auth';
import { and, asc, eq, gt, isNotNull, isNull, or } from 'drizzle-orm';

export async function findUserByEmail(email: string, executor: DatabaseExecutor = db) {
  const [user] = await executor.select().from(dUsers).where(eq(dUsers.email, email));
  return user ?? null;
}

export async function findUserById(id: string, executor: DatabaseExecutor = db) {
  const [user] = await executor.select().from(dUsers).where(eq(dUsers.id, id));
  return user ?? null;
}

// FR-40: members are the accounts that went through activation, so they alone carry a membership status. The
// columns are listed one by one so the embedding and the photo path can never reach a caller.
export function listMembers(executor: DatabaseExecutor = db) {
  return executor
    .select({
      id: dUsers.id,
      name: dUsers.name,
      email: dUsers.email,
      membershipStatus: dUsers.membershipStatus,
      membershipPlan: dUsers.membershipPlan,
      aptitudeStatus: dUsers.aptitudeStatus,
    })
    .from(dUsers)
    .where(isNotNull(dUsers.membershipStatus))
    .orderBy(asc(dUsers.name), asc(dUsers.email));
}

// FR-9: turns a cleared applicant into a member. Called inside a transaction alongside assignGroup
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

export async function assignGroup(userId: string, groupId: PolicyGroupId, executor: DatabaseExecutor = db) {
  await executor.insert(fUserPolicyGroupOnUser).values({ userId, groupId }).onConflictDoNothing();
}

// RN-10: a user's effective grants are their own non-expired policy rows plus every policy of each non-expired
// group membership, the latter always as `granted` (a group never denies).
export async function findActiveGrants(userId: string, now: Date, executor: DatabaseExecutor = db) {
  const direct = await executor
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

  const viaGroups = await executor
    .select({
      operation: dUserPolicy.operation,
      resource: dUserPolicy.resource,
      scope: dUserPolicy.scope,
      expiresOn: fUserPolicyGroupOnUser.expiresOn,
    })
    .from(fUserPolicyGroupOnUser)
    .innerJoin(dUserPolicyGroupPolicy, eq(dUserPolicyGroupPolicy.groupId, fUserPolicyGroupOnUser.groupId))
    .innerJoin(dUserPolicy, eq(dUserPolicy.id, dUserPolicyGroupPolicy.policyId))
    .where(
      and(
        eq(fUserPolicyGroupOnUser.userId, userId),
        or(isNull(fUserPolicyGroupOnUser.expiresOn), gt(fUserPolicyGroupOnUser.expiresOn, now)),
      ),
    );

  return [...direct, ...viaGroups.map((grant) => ({ ...grant, effect: 'granted' as const }))];
}
