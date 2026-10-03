import { type DatabaseExecutor, db } from '@api/db/client';
import {
  dUserPolicy,
  dUserPolicyGroup,
  dUserPolicyGroupPolicy,
  dUsers,
  fUserPolicyGroupOnUser,
  fUserPolicyOnUser,
} from '@api/db/schema';
import { and, asc, eq } from 'drizzle-orm';

export function listPolicies() {
  return db.select().from(dUserPolicy).orderBy(asc(dUserPolicy.id));
}

export function listGroups() {
  return db.select().from(dUserPolicyGroup).orderBy(asc(dUserPolicyGroup.id));
}

export function listGroupPolicies() {
  return db.select().from(dUserPolicyGroupPolicy);
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

export function listMemberships() {
  return db.select().from(fUserPolicyGroupOnUser);
}

export async function userExists(userId: string) {
  const [user] = await db.select({ id: dUsers.id }).from(dUsers).where(eq(dUsers.id, userId));
  return Boolean(user);
}

export async function policyExists(policyId: string) {
  const [policy] = await db.select({ id: dUserPolicy.id }).from(dUserPolicy).where(eq(dUserPolicy.id, policyId));
  return Boolean(policy);
}

export async function groupExists(groupId: string) {
  const [group] = await db
    .select({ id: dUserPolicyGroup.id })
    .from(dUserPolicyGroup)
    .where(eq(dUserPolicyGroup.id, groupId));
  return Boolean(group);
}

export async function upsertGrant(
  input: { userId: string; policyId: string; effect: 'granted' | 'denied'; expiresOn: Date | null },
  executor: DatabaseExecutor = db,
) {
  const [grant] = await executor
    .insert(fUserPolicyOnUser)
    .values(input)
    .onConflictDoUpdate({
      target: [fUserPolicyOnUser.userId, fUserPolicyOnUser.policyId],
      set: { effect: input.effect, expiresOn: input.expiresOn },
    })
    .returning();
  return grant!;
}

export async function setExpiry(
  userId: string,
  policyId: string,
  expiresOn: Date | null,
  executor: DatabaseExecutor = db,
) {
  const [grant] = await executor
    .update(fUserPolicyOnUser)
    .set({ expiresOn })
    .where(and(eq(fUserPolicyOnUser.userId, userId), eq(fUserPolicyOnUser.policyId, policyId)))
    .returning();
  return grant ?? null;
}

export async function upsertMembership(
  input: { userId: string; groupId: string; expiresOn: Date | null },
  executor: DatabaseExecutor = db,
) {
  const [membership] = await executor
    .insert(fUserPolicyGroupOnUser)
    .values(input)
    .onConflictDoUpdate({
      target: [fUserPolicyGroupOnUser.userId, fUserPolicyGroupOnUser.groupId],
      set: { expiresOn: input.expiresOn },
    })
    .returning();
  return membership!;
}

export async function setMembershipExpiry(
  userId: string,
  groupId: string,
  expiresOn: Date | null,
  executor: DatabaseExecutor = db,
) {
  const [membership] = await executor
    .update(fUserPolicyGroupOnUser)
    .set({ expiresOn })
    .where(and(eq(fUserPolicyGroupOnUser.userId, userId), eq(fUserPolicyGroupOnUser.groupId, groupId)))
    .returning();
  return membership ?? null;
}
