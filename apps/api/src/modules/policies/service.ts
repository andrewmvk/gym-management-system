import { type DatabaseExecutor, db } from '@api/db/client';
import { findActiveGrants } from '@api/modules/auth/repository';
import * as repository from '@api/modules/policies/repository';
import { defineAbilityFor } from '@cadence/shared/auth';
import type {
  AssignGroupInput,
  ExtendGroupInput,
  ExtendPolicyInput,
  GrantPolicyInput,
  RevokeGroupInput,
  RevokePolicyInput,
} from '@cadence/shared/schemas/policies';
import { TRPCError } from '@trpc/server';

const DIRECT_SOURCE = 'direct';

function isActive(expiresOn: Date | null, now: Date) {
  return expiresOn === null || expiresOn.getTime() > now.getTime();
}

function requireFutureExpiry(expiresOn: string | null | undefined, now: Date) {
  if (expiresOn == null) return null;
  const date = new Date(expiresOn);
  if (date.getTime() <= now.getTime()) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'The expiry date must be in the future' });
  }
  return date;
}

function requireFound<T>(row: T | null, message: string): T {
  if (!row) throw new TRPCError({ code: 'NOT_FOUND', message });
  return row;
}

// RN-10 as the screen needs it: for every policy a user currently holds, where it comes from ("direct" or a group
// id) and whether an active direct denial overrides it.
function effectivePolicies(
  memberships: { groupId: string; isActive: boolean }[],
  grants: { policyId: string; effect: 'granted' | 'denied'; isActive: boolean }[],
  policiesOfGroup: Map<string, string[]>,
) {
  const sources = new Map<string, string[]>();
  const addSource = (policyId: string, source: string) =>
    sources.set(policyId, [...(sources.get(policyId) ?? []), source]);

  for (const membership of memberships.filter((item) => item.isActive)) {
    for (const policyId of policiesOfGroup.get(membership.groupId) ?? []) addSource(policyId, membership.groupId);
  }
  for (const grant of grants.filter((item) => item.isActive && item.effect === 'granted')) {
    addSource(grant.policyId, DIRECT_SOURCE);
  }
  const denied = new Set(
    grants.filter((item) => item.isActive && item.effect === 'denied').map((item) => item.policyId),
  );

  return [...sources.entries()]
    .map(([policyId, policySources]) => ({ policyId, sources: policySources, isDenied: denied.has(policyId) }))
    .sort((a, b) => a.policyId.localeCompare(b.policyId));
}

export async function list(now = new Date()) {
  const [policies, groups, groupPolicies, users, grants, memberships] = await Promise.all([
    repository.listPolicies(),
    repository.listGroups(),
    repository.listGroupPolicies(),
    repository.listUsers(),
    repository.listGrants(),
    repository.listMemberships(),
  ]);

  const policiesOfGroup = new Map<string, string[]>();
  for (const { groupId, policyId } of groupPolicies) {
    policiesOfGroup.set(groupId, [...(policiesOfGroup.get(groupId) ?? []), policyId]);
  }

  return {
    policies,
    groups: groups.map((group) => ({ ...group, policyIds: (policiesOfGroup.get(group.id) ?? []).sort() })),
    users: users.map((user) => {
      const userGrants = grants
        .filter((grant) => grant.userId === user.id)
        .map(({ policyId, effect, expiresOn }) => ({ policyId, effect, expiresOn, isActive: isActive(expiresOn, now) }))
        .sort((a, b) => a.policyId.localeCompare(b.policyId));
      const userMemberships = memberships
        .filter((membership) => membership.userId === user.id)
        .map(({ groupId, expiresOn }) => ({ groupId, expiresOn, isActive: isActive(expiresOn, now) }))
        .sort((a, b) => a.groupId.localeCompare(b.groupId));

      return {
        ...user,
        groups: userMemberships,
        grants: userGrants,
        effective: effectivePolicies(userMemberships, userGrants, policiesOfGroup),
      };
    }),
  };
}

// The acting admin must stay able to open the staff area and manage policies, with no account recovery to undo a
// self-lockout (RN-13). Checked on the effective ability the change produces, so it covers a direct revoke or denial
// and ending the group that supplies the access alike; a change to someone else can never trigger it.
async function applyChange<T>(
  actorId: string,
  targetUserId: string,
  now: Date,
  change: (executor: DatabaseExecutor) => Promise<T>,
) {
  return db.transaction(async (tx) => {
    const result = await change(tx);
    if (targetUserId === actorId) {
      const ability = defineAbilityFor({ id: actorId }, await findActiveGrants(actorId, now, tx), now);
      if (ability.cannot('read', 'StaffApp') || ability.cannot('manage', 'UserPolicyAssignment')) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "You can't remove your own access to the staff area or to policy management",
        });
      }
    }
    return result;
  });
}

export async function grant(input: GrantPolicyInput, actorId: string, now = new Date()) {
  const expiresOn = requireFutureExpiry(input.expiresOn, now);
  if (!(await repository.userExists(input.userId))) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'That user does not exist' });
  }
  if (!(await repository.policyExists(input.policyId))) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'That policy does not exist' });
  }
  return applyChange(actorId, input.userId, now, (executor) =>
    repository.upsertGrant(
      { userId: input.userId, policyId: input.policyId, effect: input.effect ?? 'granted', expiresOn },
      executor,
    ),
  );
}

export async function revoke(input: RevokePolicyInput, actorId: string, now = new Date()) {
  return applyChange(actorId, input.userId, now, async (executor) =>
    requireFound(
      await repository.setExpiry(input.userId, input.policyId, now, executor),
      'That user does not hold this policy directly',
    ),
  );
}

export async function extend(input: ExtendPolicyInput, actorId: string, now = new Date()) {
  const expiresOn = requireFutureExpiry(input.expiresOn, now);
  return applyChange(actorId, input.userId, now, async (executor) =>
    requireFound(
      await repository.setExpiry(input.userId, input.policyId, expiresOn, executor),
      'That user does not hold this policy directly',
    ),
  );
}

export async function assignGroup(input: AssignGroupInput, actorId: string, now = new Date()) {
  const expiresOn = requireFutureExpiry(input.expiresOn, now);
  if (!(await repository.userExists(input.userId))) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'That user does not exist' });
  }
  if (!(await repository.groupExists(input.groupId))) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'That group does not exist' });
  }
  return applyChange(actorId, input.userId, now, (executor) =>
    repository.upsertMembership({ userId: input.userId, groupId: input.groupId, expiresOn }, executor),
  );
}

export async function revokeGroup(input: RevokeGroupInput, actorId: string, now = new Date()) {
  return applyChange(actorId, input.userId, now, async (executor) =>
    requireFound(
      await repository.setMembershipExpiry(input.userId, input.groupId, now, executor),
      'That user does not belong to this group',
    ),
  );
}

export async function extendGroup(input: ExtendGroupInput, actorId: string, now = new Date()) {
  const expiresOn = requireFutureExpiry(input.expiresOn, now);
  return applyChange(actorId, input.userId, now, async (executor) =>
    requireFound(
      await repository.setMembershipExpiry(input.userId, input.groupId, expiresOn, executor),
      'That user does not belong to this group',
    ),
  );
}
