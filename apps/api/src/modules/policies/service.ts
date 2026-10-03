import * as repository from '@api/modules/policies/repository';
import { LOCKOUT_PROTECTED_POLICY_IDS } from '@cadence/shared/auth';
import type { ExtendPolicyInput, GrantPolicyInput, RevokePolicyInput } from '@cadence/shared/schemas/policies';
import { TRPCError } from '@trpc/server';

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

export async function list(now = new Date()) {
  const [policies, users, grants] = await Promise.all([
    repository.listPolicies(),
    repository.listUsers(),
    repository.listGrants(),
  ]);

  return {
    policies,
    users: users.map((user) => ({
      ...user,
      grants: grants
        .filter((grant) => grant.userId === user.id)
        .map(({ policyId, effect, expiresOn }) => ({
          policyId,
          effect,
          expiresOn,
          isActive: isActive(expiresOn, now),
        }))
        .sort((a, b) => a.policyId.localeCompare(b.policyId)),
    })),
  };
}

// The acting admin must stay able to open the staff area and manage policies; with no account recovery,
// a self-revoke could leave nobody able to undo it.
function assertNotSelfLockout(actorId: string, target: { userId: string; policyId: string }) {
  if (target.userId === actorId && (LOCKOUT_PROTECTED_POLICY_IDS as readonly string[]).includes(target.policyId)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: "You can't remove your own access to the staff area or to policy management",
    });
  }
}

export async function grant(input: GrantPolicyInput, actorId: string, now = new Date()) {
  if (input.effect === 'denied') assertNotSelfLockout(actorId, input);
  const expiresOn = requireFutureExpiry(input.expiresOn, now);
  if (!(await repository.userExists(input.userId))) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'That user does not exist' });
  }
  if (!(await repository.policyExists(input.policyId))) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'That policy does not exist' });
  }
  return repository.upsertGrant({
    userId: input.userId,
    policyId: input.policyId,
    effect: input.effect ?? 'granted',
    expiresOn,
  });
}

export async function revoke(input: RevokePolicyInput, actorId: string, now = new Date()) {
  assertNotSelfLockout(actorId, input);
  return requireGrant(await repository.setExpiry(input.userId, input.policyId, now));
}

export async function extend(input: ExtendPolicyInput, now = new Date()) {
  const expiresOn = requireFutureExpiry(input.expiresOn, now);
  return requireGrant(await repository.setExpiry(input.userId, input.policyId, expiresOn));
}

function requireGrant<T>(grant: T | null): T {
  if (!grant) throw new TRPCError({ code: 'NOT_FOUND', message: 'That user does not hold this policy' });
  return grant;
}
