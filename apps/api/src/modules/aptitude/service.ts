import { db } from '@api/db/client';
import type { User } from '@api/db/schema';
import {
  type ComputeFaceEmbedding,
  computeFaceEmbedding as defaultComputeFaceEmbedding,
} from '@api/lib/face-embedding';
import { saveUpload } from '@api/lib/uploads';
import { type AiResult, type AiVerdict, AiVerdictSchema, runStructured } from '@api/modules/ai';
import * as repository from '@api/modules/aptitude/repository';
import {
  type GetAptitudeStatusInput,
  QUESTIONNAIRE_V1,
  type QuestionnaireAnswer,
  type RecheckInput,
  type SubmitSignupInput,
} from '@cadence/shared/schemas/aptitude';
import { type CheckEmailInput, CONSENT_VERSION } from '@cadence/shared/schemas/signup';

// The only consent type this project defines today (FR-46). A constant, not a free string.
const BIOMETRIC_CONSENT_TYPE = 'biometric_facial';

type EmailState =
  | { status: 'email_blocked' }
  | { status: 'already_registered' }
  | { status: 'resumable'; userId: string }
  | { status: 'available'; existing: User | null };

// An e-mail with an unfinished row (no password, not rejected) is only resumable once its questionnaire
// was submitted: before that point nothing a signup collected is final, so it starts over (FR-1).
async function lookupEmail(email: string): Promise<EmailState> {
  const existing = await repository.findByEmail(email);
  if (!existing) return { status: 'available', existing: null };
  if (existing.passwordHash) return { status: 'already_registered' };
  if (existing.aptitudeStatus === 'rejected') return { status: 'email_blocked' };
  if (await repository.findQuestionnaireByUserId(existing.id)) return { status: 'resumable', userId: existing.id };
  return { status: 'available', existing };
}

export type CheckEmailResult = Exclude<EmailState, { status: 'available' }> | { status: 'available' };

// Read-only: lets the first signup step reject a blocked or registered e-mail, or jump a returning
// applicant to their verdict, without storing anything. No account exists yet before aptitude clearance
// (FR-9), so this is intentionally public - the d_users id returned for a resumable signup is the
// capability that identifies the applicant afterward. Anyone who knows an e-mail can resume that
// signup; acceptable for this academic, non-deployed scope (docs/01-product-overview.md).
export async function checkEmail(input: CheckEmailInput): Promise<CheckEmailResult> {
  const state = await lookupEmail(input.email);
  return state.status === 'available' ? { status: 'available' } : state;
}

export type SubmitSignupResult =
  | { status: 'email_blocked' }
  | { status: 'already_registered' }
  | { status: 'resumed'; userId: string }
  | { status: 'photo_rejected'; reason: 'no_face' | 'multiple_faces' | 'unavailable' }
  | { status: 'submitted'; userId: string; outcome: AptitudeOutcome };

class PhotoRejectedError extends Error {
  constructor(readonly reason: 'no_face' | 'multiple_faces' | 'unavailable') {
    super(`Reference photo rejected: ${reason}`);
  }
}

// FR-1..FR-4, FR-46: the single write of the whole pre-verdict signup (details, consent, reference
// photo, questionnaire), so an applicant who abandons the wizard leaves nothing behind. The user row, the
// consent event and the embedding share one transaction: a rejected photo rolls everything back.
// FR-46 / RN-12: the consent event is recorded before the embedding is computed. The raw photo is
// written to disk only after a successful embedding (audit/recompute, docs/04-architecture.md §5); neither
// it nor the embedding is ever returned to the caller. An e-mail whose questionnaire already exists is
// never overwritten, so a verdict can't be gamed by re-signing up with other answers.
export async function submitSignup(
  input: SubmitSignupInput,
  computeFaceEmbedding: ComputeFaceEmbedding = defaultComputeFaceEmbedding,
  evaluateAptitude: EvaluateAptitude = defaultEvaluateAptitude,
): Promise<SubmitSignupResult> {
  const state = await lookupEmail(input.email);
  if (state.status === 'resumable') return { status: 'resumed', userId: state.userId };
  if (state.status !== 'available') return { status: state.status };

  const basicInfo = {
    name: input.name,
    phone: input.phone,
    birthdate: input.birthdate,
    gender: input.gender,
  };
  const bytes = Buffer.from(input.photo.imageBase64.replace(/^data:[^;]+;base64,/, ''), 'base64');

  let userId: string;
  try {
    userId = await db.transaction(async (tx) => {
      const user = state.existing
        ? await repository.updateBasicInfo(state.existing.id, basicInfo, tx)
        : await repository.insertPendingApplicant({ ...basicInfo, email: input.email }, tx);
      await repository.insertConsentEvent(
        {
          userId: user.id,
          consentType: BIOMETRIC_CONSENT_TYPE,
          consentVersion: input.consentVersion ?? CONSENT_VERSION,
        },
        tx,
      );

      const embedding = await computeFaceEmbedding(bytes);
      if (!embedding.ok) throw new PhotoRejectedError(embedding.reason);

      const saved = await saveUpload({
        ownerId: user.id,
        kind: 'reference_photo',
        filename: 'reference-photo',
        mimeType: input.photo.mimeType,
        base64: input.photo.imageBase64,
      });
      await repository.saveReferencePhoto(
        user.id,
        { referencePhotoPath: saved.path, referenceFaceEmbedding: embedding.embedding },
        tx,
      );
      return user.id;
    });
  } catch (error) {
    if (error instanceof PhotoRejectedError) return { status: 'photo_rejected', reason: error.reason };
    throw error;
  }

  const evaluation = await evaluateAptitude(input.answers);
  const aiResult = evaluation.ok ? evaluation.data.verdict : 'pending_retry';
  const aiNotes = evaluation.ok ? evaluation.data.notes : 'AI evaluation unavailable; will be re-checked.';

  await repository.upsertQuestionnaire({ userId, answers: input.answers, aiResult, aiNotes });
  if (aiResult === 'cleared') await repository.setAptitudeStatus(userId, 'cleared');

  return { status: 'submitted', userId, outcome: deriveOutcome(aiResult) };
}

// FR-3 / FR-4: the system prompt and per-question wording aren't specified anywhere in the docs; this
// is this project's own product decision, not a requirement quote.
const APTITUDE_SYSTEM_PROMPT =
  "You are a fitness intake screener for a gym. Given a member's health questionnaire answers, decide " +
  'whether they are cleared to begin exercising without medical documentation, or require a medical ' +
  'certificate before starting. Be conservative: when in doubt, require a certificate. Respond only ' +
  'with a verdict and brief reasoning notes.';

function questionnaireUserPrompt(answers: QuestionnaireAnswer[]): string {
  const lines = answers.map((a) => {
    const question = QUESTIONNAIRE_V1.find((q) => q.id === a.questionId)?.text ?? a.questionId;
    const detail = a.detail ? ` (detail: ${a.detail})` : '';
    return `- ${question} ${a.answer ? 'Yes' : 'No'}${detail}`;
  });
  return `Questionnaire answers:\n${lines.join('\n')}`;
}

export type EvaluateAptitude = (answers: QuestionnaireAnswer[]) => Promise<AiResult<AiVerdict>>;

async function defaultEvaluateAptitude(answers: QuestionnaireAnswer[]): Promise<AiResult<AiVerdict>> {
  return runStructured({
    purpose: 'aptitude',
    system: APTITUDE_SYSTEM_PROMPT,
    user: questionnaireUserPrompt(answers),
    schema: AiVerdictSchema,
  });
}

// RN-01: not_cleared routes to the certificate step (FR-5, P-10); an AI failure is its own state,
// never coalesced into a real decision.
function deriveOutcome(aiResult: 'cleared' | 'not_cleared' | 'pending_retry'): AptitudeOutcome {
  return aiResult === 'not_cleared' ? 'certificate_required' : aiResult;
}

export type AptitudeOutcome = 'cleared' | 'certificate_required' | 'pending_retry';

export type RecheckResult = { status: AptitudeOutcome } | { status: 'not_pending_retry' } | { status: 'unavailable' };

// FR-4: re-evaluates only a questionnaire whose latest result is pending_retry - there is no
// background retry job, so this only ever runs when the applicant reopens the page or asks explicitly.
export async function recheck(
  input: RecheckInput,
  evaluateAptitude: EvaluateAptitude = defaultEvaluateAptitude,
): Promise<RecheckResult> {
  const user = await repository.findById(input.userId);
  if (user?.aptitudeStatus !== 'pending') return { status: 'unavailable' };

  const questionnaire = await repository.findQuestionnaireByUserId(input.userId);
  if (questionnaire?.aiResult !== 'pending_retry') return { status: 'not_pending_retry' };

  const evaluation = await evaluateAptitude(questionnaire.answers);
  const aiResult = evaluation.ok ? evaluation.data.verdict : 'pending_retry';
  const aiNotes = evaluation.ok ? evaluation.data.notes : questionnaire.aiNotes;

  await repository.upsertQuestionnaire({ userId: input.userId, answers: questionnaire.answers, aiResult, aiNotes });
  if (aiResult === 'cleared') await repository.setAptitudeStatus(input.userId, 'cleared');

  return { status: deriveOutcome(aiResult) };
}

export type AptitudeStatusResult =
  | { status: 'unavailable' }
  | {
      status:
        | 'not_submitted'
        | 'pending_retry'
        | 'certificate_required'
        | 'certificate_pending_review'
        | 'cleared'
        | 'rejected';
      questionnaireResult: 'cleared' | 'not_cleared' | 'pending_retry' | null;
      certificateResult: 'cleared' | 'not_cleared' | 'pending_retry' | null;
    };

// So a returning applicant resumes in the right signup step. d_users.aptitude_status is the source of
// truth (cleared/rejected are both final, set by submitSignup or P-10's certificate review);
// while still pending, the sub-state comes from the questionnaire and, once one exists, the certificate.
export async function getAptitudeStatus(input: GetAptitudeStatusInput): Promise<AptitudeStatusResult> {
  const user = await repository.findById(input.userId);
  if (!user) return { status: 'unavailable' };

  if (user.aptitudeStatus === 'rejected') {
    return { status: 'rejected', questionnaireResult: null, certificateResult: null };
  }

  const questionnaire = await repository.findQuestionnaireByUserId(input.userId);

  if (user.aptitudeStatus === 'cleared') {
    return { status: 'cleared', questionnaireResult: questionnaire?.aiResult ?? null, certificateResult: null };
  }

  if (!questionnaire) return { status: 'not_submitted', questionnaireResult: null, certificateResult: null };
  if (questionnaire.aiResult !== 'not_cleared') {
    return {
      status: deriveOutcome(questionnaire.aiResult),
      questionnaireResult: questionnaire.aiResult,
      certificateResult: null,
    };
  }

  // not_cleared: FR-5, a certificate is needed before this applicant can progress further.
  const certificate = await repository.findLatestCertificateByUserId(input.userId);
  if (!certificate) {
    return { status: 'certificate_required', questionnaireResult: 'not_cleared', certificateResult: null };
  }
  return {
    status: 'certificate_pending_review',
    questionnaireResult: 'not_cleared',
    certificateResult: certificate.aiResult,
  };
}
