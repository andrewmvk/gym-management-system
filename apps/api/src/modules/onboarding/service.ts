import type { OnboardingSubmitInput } from '@cadence/shared/schemas/onboarding';
import { saveUpload } from '@api/lib/uploads';
import * as repository from '@api/modules/onboarding/repository';

export interface OnboardingStatus {
  completed: boolean;
  lastSubmittedAt: Date | null;
}

// FR-12 / FR-13: every attachment is stored through the shared uploads adapter (kind exam) so its
// access control - owner-only reads - matches every other file kind (rules in apps/api/src/routes/files.ts).
export async function submit(userId: string, input: OnboardingSubmitInput) {
  const attachments = input.attachments ?? [];
  const saved = await Promise.all(
    attachments.map((attachment) =>
      saveUpload({ ownerId: userId, kind: 'exam', filename: attachment.filename, mimeType: attachment.mimeType, base64: attachment.base64 }),
    ),
  );

  return repository.insertSubmission({
    userId,
    medications: input.medications ?? [],
    physicalConditions: { ...input.physicalConditions, conditions: input.physicalConditions.conditions ?? [] },
    goals: input.goals,
    examAttachmentPaths: saved.map((file) => file.path),
  });
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
