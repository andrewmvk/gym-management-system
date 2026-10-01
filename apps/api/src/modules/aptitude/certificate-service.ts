import { saveUpload } from '@api/lib/uploads';
import { type AiResult, type AiVerdict, AiVerdictSchema, runStructured } from '@api/modules/ai';
import * as repository from '@api/modules/aptitude/repository';
import { type AdminResult, resolveAptitudeStatus } from '@api/modules/aptitude/resolve-aptitude-status';
import type { CertificateReviewInput, CertificateUploadInput } from '@cadence/shared/schemas/certificates';

// FR-2 of this prompt's own review (see prompts/P-10, "the AI can't see the image" caveat): the AI
// module only carries text, so this reviewer is only ever given the file's name and type, never its
// actual content. It cannot verify what the document says, so it defaults to not_cleared and explains
// why - the real decision always comes from the admin queue (RN-02), this is not a bypass of it.
const CERTIFICATE_SYSTEM_PROMPT =
  "You are a first-pass reviewer for a gym applicant's medical certificate. You are only given the " +
  "file's name and type, not its actual content, so you cannot verify what the document says. Because " +
  'every certificate is routed to a human admin regardless of your answer, respond not_cleared and ' +
  "explain in your notes that you could not inspect the file's content, so a human must review it.";

function buildCertificateUserPrompt(filename: string, mimeType: string): string {
  return `Certificate filename: ${filename}\nFile type: ${mimeType}`;
}

export type EvaluateCertificate = (filename: string, mimeType: string) => Promise<AiResult<AiVerdict>>;

async function defaultEvaluateCertificate(filename: string, mimeType: string): Promise<AiResult<AiVerdict>> {
  return runStructured({
    purpose: 'certificate',
    system: CERTIFICATE_SYSTEM_PROMPT,
    user: buildCertificateUserPrompt(filename, mimeType),
    schema: AiVerdictSchema,
  });
}

export type UploadCertificateResult = { status: 'ok' } | { status: 'unavailable' };

// FR-5: allowed only once the questionnaire itself needs one - not_cleared, or a persistent
// pending_retry (so a member isn't stuck forever if the questionnaire AI keeps failing). Uploading
// never changes aptitude_status by itself (RN-02/FR-6): every certificate, whatever its AI result,
// waits in the admin queue for a human decision.
export async function uploadCertificate(
  input: CertificateUploadInput,
  evaluateCertificate: EvaluateCertificate = defaultEvaluateCertificate,
): Promise<UploadCertificateResult> {
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

  const evaluation = await evaluateCertificate(input.filename, input.mimeType);
  const aiResult = evaluation.ok ? evaluation.data.verdict : 'pending_retry';
  const aiNotes = evaluation.ok
    ? evaluation.data.notes
    : 'AI evaluation unavailable; an admin will review this certificate.';

  await repository.insertCertificate({ userId: input.userId, filePath: saved.path, aiResult, aiNotes });
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
  adminReviewedAt: Date | null;
  adminOverrideResult: 'cleared' | 'not_cleared' | null;
  uploadedAt: Date;
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
