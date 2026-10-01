import { type DatabaseExecutor, db } from '@api/db/client';
import {
  type AptitudeQuestionnaire,
  dUsers,
  fAptitudeQuestionnaires,
  fConsentEvents,
  fMedicalCertificates,
  type MedicalCertificate,
  type User,
} from '@api/db/schema';
import type { QuestionnaireAnswer } from '@cadence/shared/schemas/aptitude';
import { and, desc, eq } from 'drizzle-orm';

type Gender = User['gender'];
type AptitudeStatus = User['aptitudeStatus'];
type AiResultValue = AptitudeQuestionnaire['aiResult'];
type AdminOverrideResult = MedicalCertificate['adminOverrideResult'];

export async function findByEmail(email: string, executor: DatabaseExecutor = db): Promise<User | null> {
  const [user] = await executor.select().from(dUsers).where(eq(dUsers.email, email));
  return user ?? null;
}

export async function findById(id: string, executor: DatabaseExecutor = db): Promise<User | null> {
  const [user] = await executor.select().from(dUsers).where(eq(dUsers.id, id));
  return user ?? null;
}

export async function insertPendingApplicant(
  input: { name: string; phone: string; email: string; birthdate: string; gender?: Gender },
  executor: DatabaseExecutor = db,
): Promise<User> {
  const [user] = await executor
    .insert(dUsers)
    .values({ ...input, aptitudeStatus: 'pending' })
    .returning();
  return user!;
}

// gender is only included in the update when provided, so resuming a signup without resubmitting it
// never clears a value the applicant already chose (FR-45).
export async function updateBasicInfo(
  id: string,
  input: { name: string; phone: string; birthdate: string; gender?: Gender },
  executor: DatabaseExecutor = db,
): Promise<User> {
  const { gender, ...rest } = input;
  const [user] = await executor
    .update(dUsers)
    .set(gender !== undefined ? { ...rest, gender } : rest)
    .where(eq(dUsers.id, id))
    .returning();
  return user!;
}

export async function saveReferencePhoto(
  id: string,
  input: { referencePhotoPath: string; referenceFaceEmbedding: number[] },
  executor: DatabaseExecutor = db,
): Promise<User> {
  const [user] = await executor.update(dUsers).set(input).where(eq(dUsers.id, id)).returning();
  return user!;
}

export async function insertConsentEvent(
  input: { userId: string; consentType: string; consentVersion: string },
  executor: DatabaseExecutor = db,
) {
  const [event] = await executor.insert(fConsentEvents).values(input).returning();
  return event!;
}

export async function hasConsent(
  userId: string,
  consentType: string,
  executor: DatabaseExecutor = db,
): Promise<boolean> {
  const [event] = await executor
    .select({ id: fConsentEvents.id })
    .from(fConsentEvents)
    .where(and(eq(fConsentEvents.userId, userId), eq(fConsentEvents.consentType, consentType)))
    .limit(1);
  return Boolean(event);
}

export async function setAptitudeStatus(
  id: string,
  aptitudeStatus: AptitudeStatus,
  executor: DatabaseExecutor = db,
): Promise<User> {
  const [user] = await executor.update(dUsers).set({ aptitudeStatus }).where(eq(dUsers.id, id)).returning();
  return user!;
}

// One row per applicant (unique user_id): a resubmission or recheck updates this row in place rather
// than appending a new one, so "the latest result" is simply its current ai_result (RN-01).
export async function upsertQuestionnaire(
  input: { userId: string; answers: QuestionnaireAnswer[]; aiResult: AiResultValue; aiNotes: string },
  executor: DatabaseExecutor = db,
): Promise<AptitudeQuestionnaire> {
  const [row] = await executor
    .insert(fAptitudeQuestionnaires)
    .values({ ...input, submittedAt: new Date() })
    .onConflictDoUpdate({
      target: fAptitudeQuestionnaires.userId,
      set: { answers: input.answers, aiResult: input.aiResult, aiNotes: input.aiNotes, submittedAt: new Date() },
    })
    .returning();
  return row!;
}

export async function findQuestionnaireByUserId(
  userId: string,
  executor: DatabaseExecutor = db,
): Promise<AptitudeQuestionnaire | null> {
  const [row] = await executor.select().from(fAptitudeQuestionnaires).where(eq(fAptitudeQuestionnaires.userId, userId));
  return row ?? null;
}

export async function insertCertificate(
  input: { userId: string; filePath: string; aiResult: AiResultValue; aiNotes: string },
  executor: DatabaseExecutor = db,
): Promise<MedicalCertificate> {
  const [row] = await executor.insert(fMedicalCertificates).values(input).returning();
  return row!;
}

export async function findCertificateById(
  id: string,
  executor: DatabaseExecutor = db,
): Promise<MedicalCertificate | null> {
  const [row] = await executor.select().from(fMedicalCertificates).where(eq(fMedicalCertificates.id, id));
  return row ?? null;
}

// Most recent certificate for the applicant, if any - used to resume the signup wizard and to gate
// re-upload (FR-5's "under review" state once one already exists).
export async function findLatestCertificateByUserId(
  userId: string,
  executor: DatabaseExecutor = db,
): Promise<MedicalCertificate | null> {
  const [row] = await executor
    .select()
    .from(fMedicalCertificates)
    .where(eq(fMedicalCertificates.userId, userId))
    .orderBy(desc(fMedicalCertificates.uploadedAt))
    .limit(1);
  return row ?? null;
}

export interface CertificateQueueRow extends MedicalCertificate {
  applicantName: string;
  applicantEmail: string;
}

// Unreviewed first (RN-02: everything must reach the queue, so nothing here skips it) - Postgres sorts
// NULL first on DESC by default, and admin_reviewed_at is null exactly for unreviewed rows. Never
// selects the applicant's reference_face_embedding or any other biometric column.
export function findCertificateQueue(executor: DatabaseExecutor = db): Promise<CertificateQueueRow[]> {
  return executor
    .select({
      id: fMedicalCertificates.id,
      userId: fMedicalCertificates.userId,
      filePath: fMedicalCertificates.filePath,
      aiResult: fMedicalCertificates.aiResult,
      aiNotes: fMedicalCertificates.aiNotes,
      reviewedByUserId: fMedicalCertificates.reviewedByUserId,
      adminReviewedAt: fMedicalCertificates.adminReviewedAt,
      adminOverrideResult: fMedicalCertificates.adminOverrideResult,
      uploadedAt: fMedicalCertificates.uploadedAt,
      applicantName: dUsers.name,
      applicantEmail: dUsers.email,
    })
    .from(fMedicalCertificates)
    .innerJoin(dUsers, eq(dUsers.id, fMedicalCertificates.userId))
    .orderBy(desc(fMedicalCertificates.adminReviewedAt), desc(fMedicalCertificates.uploadedAt));
}

export async function reviewCertificate(
  id: string,
  input: { reviewedByUserId: string; adminOverrideResult: AdminOverrideResult },
  executor: DatabaseExecutor = db,
): Promise<MedicalCertificate> {
  const [row] = await executor
    .update(fMedicalCertificates)
    .set({
      reviewedByUserId: input.reviewedByUserId,
      adminReviewedAt: new Date(),
      adminOverrideResult: input.adminOverrideResult,
    })
    .where(eq(fMedicalCertificates.id, id))
    .returning();
  return row!;
}
