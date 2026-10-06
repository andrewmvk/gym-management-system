import type { OnboardingSubmission } from '@api/db/schema';
import { todayLocal } from '@api/lib/dates';
import { logger } from '@api/lib/logger';
import { saveUpload } from '@api/lib/uploads';
import * as repository from '@api/modules/onboarding/repository';
import { type StreamedPlanExercise, streamGenerateForDate } from '@api/modules/plans/service';
import type { ExamEntry, ExamInput, OnboardingSubmitInput } from '@cadence/shared/schemas/onboarding';
import { TRPCError } from '@trpc/server';

const log = logger.child({ module: 'onboarding' });

export interface OnboardingStatus {
  completed: boolean;
  lastSubmittedAt: Date | null;
}

const examAttachmentPattern = (userId: string) => new RegExp(`^${userId}/exam/[0-9a-f-]{36}\\.(jpg|png|pdf)$`);

// FR-12: a new file is stored through the shared uploads adapter (kind exam) so its access control -
// owner-only reads - matches every other file kind (rules in apps/api/src/routes/files.ts). A path kept
// from the current profile is only accepted when it is one of this member's own exam files.
async function toStoredExam(userId: string, exam: ExamInput): Promise<ExamEntry> {
  const { attachment, attachmentPath, ...entry } = exam;
  if (attachment) {
    const saved = await saveUpload({
      ownerId: userId,
      kind: 'exam',
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      base64: attachment.base64,
    });
    return { ...entry, attachmentPath: saved.path };
  }
  if (attachmentPath) {
    if (!examAttachmentPattern(userId).test(attachmentPath)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid exam attachment' });
    }
    return { ...entry, attachmentPath };
  }
  return entry;
}

export type OnboardingStreamEvent =
  | { type: 'saved'; submission: OnboardingSubmission }
  | { type: 'exercise'; exercise: StreamedPlanExercise }
  | { type: 'done'; plan: 'built' | 'kept' | 'failed' };

// The submission is saved and reported first, so the member's information is never held back by the plan
// that follows it. The plan is built best-effort and its exercises stream as the AI finishes each one.
export async function* submitStream(
  userId: string,
  input: OnboardingSubmitInput,
): AsyncGenerator<OnboardingStreamEvent> {
  const exams = await Promise.all((input.exams ?? []).map((exam) => toStoredExam(userId, exam)));

  const submission = await repository.insertSubmission({
    userId,
    heightCm: input.heightCm,
    weightKg: input.weightKg,
    medications: input.medications ?? [],
    physicalConditions: { ...input.physicalConditions, conditions: input.physicalConditions.conditions ?? [] },
    goals: input.goals,
    exams,
  });

  yield { type: 'saved', submission };

  // FR-13: best effort only - a failure here never fails the onboarding submission itself. The member
  // can always retry via plans.generateToday (P-13). A needs_confirmation result (trainer edit or ticked
  // exercises on an existing plan) is skipped on purpose: nothing here may overwrite the member's work.
  let plan: 'built' | 'kept' | 'failed' = 'failed';
  try {
    for await (const event of streamGenerateForDate(userId, todayLocal(), false)) {
      if (event.type === 'exercise') yield event;
      else plan = event.result.status === 'ok' ? 'built' : 'kept';
    }
  } catch (error) {
    log.warn({ error, userId }, 'best-effort plan generation after onboarding submission failed');
  }
  yield { type: 'done', plan };
}

export async function submit(userId: string, input: OnboardingSubmitInput) {
  let saved: OnboardingSubmission | undefined;
  for await (const event of submitStream(userId, input)) {
    if (event.type === 'saved') saved = event.submission;
  }
  return saved!;
}

// FR-14: onboarding is never "done" in the sense of a single row - completed just means at least one
// submission exists yet, so a member who added more later still reads as completed.
export async function getStatus(userId: string): Promise<OnboardingStatus> {
  const submissions = await repository.findSubmissionsByUserId(userId);
  return { completed: submissions.length > 0, lastSubmittedAt: submissions[0]?.submittedAt ?? null };
}

export function listMine(userId: string) {
  return repository.findSubmissionsByUserId(userId);
}
