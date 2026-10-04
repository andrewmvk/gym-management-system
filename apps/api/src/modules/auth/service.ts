import { db } from '@api/db/client';
import type { User } from '@api/db/schema';
import { onMemberActivated } from '@api/modules/auth/member-activated';
import {
  activateMember as activateMemberRow,
  assignGroup,
  findActiveGrants,
  findUserByEmail,
  findUserById,
  listMembers as listMemberRows,
} from '@api/modules/auth/repository';
import {
  type AbilityRule,
  type AppAbility,
  buildAbilityRules,
  defineAbilityFor,
  MEMBER_GROUP,
} from '@cadence/shared/auth';
import type { SetPasswordInput } from '@cadence/shared/schemas/auth';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';

// Compared against when the e-mail is unknown, so both failure paths spend the same bcrypt time.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('cadence-timing-equalizer', 10);
const BCRYPT_ROUNDS = 10;

// FR-40 is mocked: there is no real membership catalog, so every activated member gets this one label.
export const DEFAULT_MEMBERSHIP_PLAN = 'Standard';

export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    aptitudeStatus: user.aptitudeStatus,
    membershipStatus: user.membershipStatus,
    membershipPlan: user.membershipPlan,
  };
}

export type PublicUser = ReturnType<typeof toPublicUser>;

export interface Session {
  user: PublicUser;
  ability: AppAbility;
  rules: AbilityRule[];
}

export function listMembers() {
  return listMemberRows();
}

export const MEMBERSHIP_INACTIVE_MESSAGE = 'Your membership is inactive. Ask the front desk to reactivate it.';

// Staff accounts have no membership status, so only an explicit 'inactive' blocks access.
function isMembershipInactive(user: Pick<User, 'membershipStatus'>) {
  return user.membershipStatus === 'inactive';
}

// Inactivity is only revealed after a correct password, so the message cannot be used to probe which e-mails exist.
export async function verifyCredentials(email: string, password: string): Promise<User | null> {
  const user = await findUserByEmail(email);
  const isValid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user?.passwordHash || !isValid) return null;
  if (isMembershipInactive(user)) throw new TRPCError({ code: 'FORBIDDEN', message: MEMBERSHIP_INACTIVE_MESSAGE });
  return user;
}

// An inactive member is unauthenticated, so a cookie issued before the lapse stops working immediately.
export async function loadSession(userId: string, now = new Date()): Promise<Session | null> {
  const user = await findUserById(userId);
  if (!user || isMembershipInactive(user)) return null;

  const grants = await findActiveGrants(user.id, now);
  return {
    user: toPublicUser(user),
    ability: defineAbilityFor(user, grants, now),
    rules: buildAbilityRules(user, grants, now),
  };
}

// FR-9 / RN-03: only a cleared applicant with no password yet can activate. Rejected and still-pending
// applicants, and a second call, are refused with a specific TRPCError rather than a domain status -
// unlike pending_retry (P-08), there is no legitimate retry path for any of these.
export async function activateMember(input: SetPasswordInput): Promise<User> {
  const applicant = await findUserById(input.userId);
  if (applicant?.aptitudeStatus !== 'cleared') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'This account cannot be activated yet.' });
  }
  if (applicant.passwordHash) {
    throw new TRPCError({ code: 'CONFLICT', message: 'This account is already activated.' });
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const user = await db.transaction(async (tx) => {
    const activated = await activateMemberRow(
      input.userId,
      { passwordHash, membershipPlan: DEFAULT_MEMBERSHIP_PLAN },
      tx,
    );
    await assignGroup(input.userId, MEMBER_GROUP, tx);
    return activated;
  });

  void onMemberActivated(user.id);

  return user;
}
