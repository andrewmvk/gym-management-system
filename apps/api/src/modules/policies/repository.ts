import { db } from '@api/db/client';
import { dUserPolicy, dUsers, fUserPolicyOnUser } from '@api/db/schema';
import { and, asc, eq } from 'drizzle-orm';

export function listPolicies() {
  return db.select().from(dUserPolicy).orderBy(asc(dUserPolicy.id));
}

export function listUsers() {
  return db
    .select({ id: dUsers.id, name: dUsers.name, email: dUsers.email })
    .from(dUsers)
    .orderBy(asc(dUsers.name), asc(dUsers.email));
}

export function listGrants() {
  return db.select().from(fUserPolicyOnUser);
}

export async function userExists(userId: string) {
  const [user] = await db.select({ id: dUsers.id }).from(dUsers).where(eq(dUsers.id, userId));
  return Boolean(user);
}

export async function policyExists(policyId: string) {
  const [policy] = await db.select({ id: dUserPolicy.id }).from(dUserPolicy).where(eq(dUserPolicy.id, policyId));
  return Boolean(policy);
}

export async function upsertGrant(input: {
  userId: string;
  policyId: string;
  effect: 'granted' | 'denied';
  expiresOn: Date | null;
}) {
  const [grant] = await db
    .insert(fUserPolicyOnUser)
    .values(input)
    .onConflictDoUpdate({
      target: [fUserPolicyOnUser.userId, fUserPolicyOnUser.policyId],
      set: { effect: input.effect, expiresOn: input.expiresOn },
    })
    .returning();
  return grant!;
}

export async function setExpiry(userId: string, policyId: string, expiresOn: Date | null) {
  const [grant] = await db
    .update(fUserPolicyOnUser)
    .set({ expiresOn })
    .where(and(eq(fUserPolicyOnUser.userId, userId), eq(fUserPolicyOnUser.policyId, policyId)))
    .returning();
  return grant ?? null;
}
