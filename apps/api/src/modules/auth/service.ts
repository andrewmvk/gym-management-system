import { buildAbilityRules, defineAbilityFor, type AbilityRule, type AppAbility } from '@cadence/shared/auth';
import bcrypt from 'bcryptjs';
import type { User } from '@api/db/schema';
import { findActiveGrants, findUserByEmail, findUserById } from '@api/modules/auth/repository';

// Compared against when the e-mail is unknown, so both failure paths spend the same bcrypt time.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('cadence-timing-equalizer', 10);

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

export async function verifyCredentials(email: string, password: string): Promise<User | null> {
  const user = await findUserByEmail(email);
  const isValid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  return user?.passwordHash && isValid ? user : null;
}

export async function loadSession(userId: string, now = new Date()): Promise<Session | null> {
  const user = await findUserById(userId);
  if (!user) return null;

  const grants = await findActiveGrants(user.id, now);
  return {
    user: toPublicUser(user),
    ability: defineAbilityFor(user, grants, now),
    rules: buildAbilityRules(user, grants, now),
  };
}
