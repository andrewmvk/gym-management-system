import type { StartSignupInput } from '@cadence/shared/schemas/signup';
import { computeFaceEmbedding as defaultComputeFaceEmbedding, type ComputeFaceEmbedding } from '@api/lib/face-embedding';
import { saveUpload } from '@api/lib/uploads';
import * as repository from '@api/modules/aptitude/repository';

type NextStep = 'photo' | 'done';

export type StartSignupResult =
  | { status: 'email_blocked' }
  | { status: 'already_registered' }
  | { status: 'created'; userId: string; nextStep: 'photo' }
  | { status: 'resumed'; userId: string; nextStep: NextStep };

export type SavePhotoResult = { status: 'ok' } | { status: 'photo_rejected'; reason: 'no_face' | 'multiple_faces' | 'unavailable' };

function nextStepFor(user: { referenceFaceEmbedding: unknown }): NextStep {
  return user.referenceFaceEmbedding ? 'done' : 'photo';
}

// FR-1: an applicant who already has an unfinished row (no password, not rejected) for this e-mail
// resumes it instead of creating a duplicate. No account exists yet before aptitude clearance (FR-9),
// so this is intentionally public - the d_users id returned is the capability that identifies the
// applicant for the rest of the signup flow. Anyone who knows an e-mail can resume that unfinished
// signup; acceptable for this academic, non-deployed scope (docs/01-product-overview.md).
export async function startSignup(input: StartSignupInput): Promise<StartSignupResult> {
  const existing = await repository.findByEmail(input.email);

  if (!existing) {
    const user = await repository.insertPendingApplicant(input);
    return { status: 'created', userId: user.id, nextStep: 'photo' };
  }

  if (existing.passwordHash) return { status: 'already_registered' };
  if (existing.aptitudeStatus === 'rejected') return { status: 'email_blocked' };

  const user = await repository.updateBasicInfo(existing.id, {
    name: input.name,
    phone: input.phone,
    birthdate: input.birthdate,
  });
  return { status: 'resumed', userId: user.id, nextStep: nextStepFor(user) };
}

// FR-2: the embedding is computed on the backend from the uploaded photo. The raw photo is written to
// disk either way (audit/recompute, docs/04-architecture.md §5); only a successful embedding is ever
// written to d_users, and neither the embedding nor the photo path is ever returned to the caller.
export async function savePhoto(
  input: { userId: string; imageBase64: string; mimeType: string },
  computeFaceEmbedding: ComputeFaceEmbedding = defaultComputeFaceEmbedding,
): Promise<SavePhotoResult> {
  const user = await repository.findById(input.userId);
  if (!user || user.aptitudeStatus !== 'pending') {
    return { status: 'photo_rejected', reason: 'unavailable' };
  }

  const saved = await saveUpload({
    ownerId: input.userId,
    kind: 'reference_photo',
    filename: 'reference-photo',
    mimeType: input.mimeType,
    base64: input.imageBase64,
  });

  const bytes = Buffer.from(input.imageBase64.replace(/^data:[^;]+;base64,/, ''), 'base64');
  const embedding = await computeFaceEmbedding(bytes);
  if (!embedding.ok) return { status: 'photo_rejected', reason: embedding.reason };

  await repository.saveReferencePhoto(input.userId, {
    referencePhotoPath: saved.path,
    referenceFaceEmbedding: embedding.embedding,
  });
  return { status: 'ok' };
}
