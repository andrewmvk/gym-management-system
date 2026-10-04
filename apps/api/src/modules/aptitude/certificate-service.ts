import { saveUpload } from '@api/lib/uploads';
import * as repository from '@api/modules/aptitude/repository';
import { type AdminResult, resolveAptitudeStatus } from '@api/modules/aptitude/resolve-aptitude-status';
import type { CertificateReviewInput, CertificateUploadInput } from '@cadence/shared/schemas/certificates';

// The AI module only carries text, so a model could only ever be handed the file's name and type, never what
// the document says. A verdict from that would be a guess dressed up as a determination, so the AI is not
// asked: the certificate is stored as pending_retry (the technical-failure state of rules/error-handling.md,
// never a real not_cleared) and the admin queue is the only decision, exactly as RN-02 already requires.
export const UNINSPECTED_CERTIFICATE_NOTES =
  'The AI could not inspect the uploaded file, so it made no determination. An admin must review it.';

export type UploadCertificateResult = { status: 'ok' } | { status: 'unavailable' };

// FR-5: allowed only once the questionnaire itself needs one - not_cleared, or a persistent
// pending_retry (so a member isn't stuck forever if the questionnaire AI keeps failing). Uploading
// never changes aptitude_status by itself (RN-02/FR-6): every certificate waits in the admin queue
// for a human decision.
export async function uploadCertificate(input: CertificateUploadInput): Promise<UploadCertificateResult> {
  const user = await repository.findById(input.userId);
  if (user?.aptitudeStatus !== 'pending') return { status: 'unavailable' };

  const questionnaire = await repository.findQuestionnaireByUserId(input.userId);
  if (!questionnaire || questionnaire.aiResult === 'cleared') return { status: 'unavailable' };

  const saved = await saveUpload({
    ownerId: input.userId,
    kind: 'certificate',
    filename: input.filename,
    mimeType: input.mimeType,
    base64: input.base64,
  });

  await repository.insertCertificate({
    userId: input.userId,
    filePath: saved.path,
    aiResult: 'pending_retry',
    aiNotes: UNINSPECTED_CERTIFICATE_NOTES,
  });
  return { status: 'ok' };
}

export interface CertificateQueueEntry {
  id: string;
  applicantName: string;
  applicantEmail: string;
  filePath: string;
  aiResult: 'cleared' | 'not_cleared' | 'pending_retry';
  aiNotes: string;
  reviewedByUserId: string | null;
  reviewedByName: string | null;
  adminReviewedAt: Date | null;
  adminOverrideResult: 'cleared' | 'not_cleared' | null;
  uploadedAt: Date;
  questionnaireResult: 'cleared' | 'not_cleared' | 'pending_retry' | null;
  questionnaireNotes: string | null;
}

export async function listQueue(): Promise<CertificateQueueEntry[]> {
  return repository.findCertificateQueue();
}

export type ReviewCertificateResult =
  | {
      status: 'ok';
      certificate: Awaited<ReturnType<typeof repository.reviewCertificate>>;
      aptitudeStatus: 'pending' | 'cleared' | 'rejected' | null;
    }
  | { status: 'not_found' }
  | { status: 'no_decision_to_confirm' };

// FR-7: "confirm" materializes ai_result into admin_override_result too, so non-null there always means
// "an admin has decided" - confirm on a pending_retry certificate has nothing to confirm (RN-01: a
// technical failure is never a real decision), so it's refused rather than silently doing nothing.
export async function reviewCertificate(
  reviewerId: string,
  input: CertificateReviewInput,
): Promise<ReviewCertificateResult> {
  const certificate = await repository.findCertificateById(input.certificateId);
  if (!certificate) return { status: 'not_found' };

  let decision: AdminResult;
  if (input.result === 'confirm') {
    if (certificate.aiResult === 'pending_retry') return { status: 'no_decision_to_confirm' };
    decision = certificate.aiResult;
  } else {
    decision = input.result;
  }

  const updated = await repository.reviewCertificate(input.certificateId, {
    reviewedByUserId: reviewerId,
    adminOverrideResult: decision,
  });

  const applicant = await repository.findById(certificate.userId);
  const questionnaire = applicant ? await repository.findQuestionnaireByUserId(applicant.id) : null;

  const resolved = applicant
    ? resolveAptitudeStatus({
        questionnaireResult: questionnaire?.aiResult ?? null,
        certificateResult: updated.aiResult,
        adminResult: decision,
        hasPassword: Boolean(applicant.passwordHash),
      })
    : null;

  if (resolved && applicant) await repository.setAptitudeStatus(applicant.id, resolved);

  return { status: 'ok', certificate: updated, aptitudeStatus: resolved };
}
