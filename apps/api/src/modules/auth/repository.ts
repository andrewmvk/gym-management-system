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
