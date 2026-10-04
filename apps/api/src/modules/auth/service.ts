import { db } from '@api/db/client';
import type { User } from '@api/db/schema';
import {
  type ComputeFaceEmbedding,
  computeFaceEmbedding as defaultComputeFaceEmbedding,
} from '@api/lib/face-embedding';
import { saveUpload } from '@api/lib/uploads';
import { onRegistrationCompleted } from '@api/modules/auth/registration-completed';
import {
  assignGroup,
  findActiveGrants,
  findUserByEmail,
  findUserById,
  insertConsentEvent,
  insertMember,
  listMembers as listMemberRows,
  saveReferencePhoto,
} from '@api/modules/auth/repository';
import {
  type AbilityRule,
  type AppAbility,
  buildAbilityRules,
  defineAbilityFor,
  MEMBER_GROUP,
} from '@cadence/shared/auth';
import type { CheckEmailInput, RegisterInput } from '@cadence/shared/schemas/signup';
import { CONSENT_VERSION } from '@cadence/shared/schemas/signup';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';

// Compared against when the e-mail is unknown, so both failure paths spend the same bcrypt time.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('cadence-timing-equalizer', 10);
const BCRYPT_ROUNDS = 10;

// FR-40 is mocked: there is no real membership catalog, so every registered member gets this one label.
export const DEFAULT_MEMBERSHIP_PLAN = 'Standard';

// The only consent type this project defines today (FR-46). A constant, not a free string.
const BIOMETRIC_CONSENT_TYPE = 'biometric_facial';

export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
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

export type CheckEmailResult = { status: 'available' } | { status: 'already_registered' };

// Read-only: lets the first registration step refuse a registered e-mail without storing anything.
// Public on purpose, since no account exists before registration (FR-9).
export async function checkEmail(input: CheckEmailInput): Promise<CheckEmailResult> {
  const existing = await findUserByEmail(input.email);
  return { status: existing ? 'already_registered' : 'available' };
}

export type PhotoRejectedReason = 'no_face' | 'multiple_faces' | 'unavailable';

export type RegisterResult =
  | { status: 'already_registered' }
  | { status: 'photo_rejected'; reason: PhotoRejectedReason }
  | { status: 'registered'; user: User };

class PhotoRejectedError extends Error {
  constructor(readonly reason: PhotoRejectedReason) {
    super(`Reference photo rejected: ${reason}`);
  }
}

// A concurrent registration of the same e-mail loses on the unique index instead of the pre-check.
function isUniqueViolation(error: unknown) {
  const causes = [error, error instanceof Error ? error.cause : undefined];
  return causes.some((cause) => (cause as { code?: string } | undefined)?.code === '23505');
}

// FR-1, FR-9, FR-46: the single write of the whole registration (details, consent, reference photo and
// password), so a person who abandons the wizard leaves nothing behind. The account, the consent event,
// the embedding and the member group share one transaction: a rejected photo rolls everything back.
// RN-12: the consent event is recorded before the embedding is computed. The raw photo is written to
// disk only after a successful embedding (audit/recompute, docs/04-architecture.md §5); neither it nor
// the embedding is ever returned to the caller.
export async function register(
  input: RegisterInput,
  computeFaceEmbedding: ComputeFaceEmbedding = defaultComputeFaceEmbedding,
): Promise<RegisterResult> {
  if (await findUserByEmail(input.email)) return { status: 'already_registered' };

  const bytes = Buffer.from(input.photo.imageBase64.replace(/^data:[^;]+;base64,/, ''), 'base64');
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  let user: User;
  try {
    user = await db.transaction(async (tx) => {
      const member = await insertMember(
        {
          name: input.name,
          phone: input.phone,
          email: input.email,
          birthdate: input.birthdate,
          gender: input.gender,
          passwordHash,
          membershipPlan: DEFAULT_MEMBERSHIP_PLAN,
        },
        tx,
      );
      await insertConsentEvent(
        {
          userId: member.id,
          consentType: BIOMETRIC_CONSENT_TYPE,
          consentVersion: input.consentVersion ?? CONSENT_VERSION,
        },
        tx,
      );

      const embedding = await computeFaceEmbedding(bytes);
      if (!embedding.ok) throw new PhotoRejectedError(embedding.reason);

      const saved = await saveUpload({
        ownerId: member.id,
        kind: 'reference_photo',
        filename: 'reference-photo',
        mimeType: input.photo.mimeType,
        base64: input.photo.imageBase64,
      });
      await saveReferencePhoto(
        member.id,
        { referencePhotoPath: saved.path, referenceFaceEmbedding: embedding.embedding },
        tx,
      );
      await assignGroup(member.id, MEMBER_GROUP, tx);
      return member;
    });
  } catch (error) {
    if (error instanceof PhotoRejectedError) return { status: 'photo_rejected', reason: error.reason };
    if (isUniqueViolation(error)) return { status: 'already_registered' };
    throw error;
  }

  void onRegistrationCompleted(user.id);

  return { status: 'registered', user };
}
