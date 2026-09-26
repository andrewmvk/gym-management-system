import {
  QUESTIONNAIRE_V1,
  type GetAptitudeStatusInput,
  type QuestionnaireAnswer,
  type RecheckInput,
  type SubmitQuestionnaireInput,
} from '@cadence/shared/schemas/aptitude';
import { CONSENT_VERSION, type RecordConsentInput, type StartSignupInput } from '@cadence/shared/schemas/signup';
import { computeFaceEmbedding as defaultComputeFaceEmbedding, type ComputeFaceEmbedding } from '@api/lib/face-embedding';
import { saveUpload } from '@api/lib/uploads';
import { AiVerdictSchema, runStructured, type AiResult, type AiVerdict } from '@api/modules/ai';
import * as repository from '@api/modules/aptitude/repository';

type NextStep = 'photo' | 'done';

export type StartSignupResult =
  | { status: 'email_blocked' }
  | { status: 'already_registered' }
  | { status: 'created'; userId: string; nextStep: 'photo' }
  | { status: 'resumed'; userId: string; nextStep: NextStep };

export type SavePhotoResult =
  | { status: 'ok' }
  | { status: 'consent_required' }
  | { status: 'photo_rejected'; reason: 'no_face' | 'multiple_faces' | 'unavailable' };

// The only consent type this project defines today (FR-46). A constant, not a free string, so the
// check in savePhoto and the write in recordConsent can never drift apart.
const BIOMETRIC_CONSENT_TYPE = 'biometric_facial';

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
    gender: input.gender,
  });
  return { status: 'resumed', userId: user.id, nextStep: nextStepFor(user) };
}

// FR-46 / RN-12: recorded before the photo step. A fresh row every time on purpose (f_consent_events
// is append-only) - re-consenting later is a new proof, not an edit to the old one.
export async function recordConsent(input: RecordConsentInput): Promise<{ status: 'ok' | 'unavailable' }> {
  const user = await repository.findById(input.userId);
  if (!user || user.aptitudeStatus !== 'pending') return { status: 'unavailable' };

  await repository.insertConsentEvent({
    userId: input.userId,
    consentType: BIOMETRIC_CONSENT_TYPE,
    consentVersion: input.consentVersion ?? CONSENT_VERSION,
  });
  return { status: 'ok' };
}

// FR-2: the embedding is computed on the backend from the uploaded photo. FR-46 / RN-12: never
// computed without a prior recorded consent, checked here so a client cannot skip the consent screen
// and reach this procedure directly. The raw photo is written to disk either way (audit/recompute,
// docs/04-architecture.md §5); only a successful embedding is ever written to d_users, and neither the
// embedding nor the photo path is ever returned to the caller.
export async function savePhoto(
  input: { userId: string; imageBase64: string; mimeType: string },
  computeFaceEmbedding: ComputeFaceEmbedding = defaultComputeFaceEmbedding,
): Promise<SavePhotoResult> {
  const user = await repository.findById(input.userId);
  if (!user || user.aptitudeStatus !== 'pending') {
    return { status: 'photo_rejected', reason: 'unavailable' };
  }

  if (!(await repository.hasConsent(input.userId, BIOMETRIC_CONSENT_TYPE))) {
    return { status: 'consent_required' };
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

export type SubmitQuestionnaireResult = { status: AptitudeOutcome } | { status: 'unavailable' };

// FR-3 / FR-4: stores the answers and the AI's verdict (or pending_retry on any AI failure) in one row
// per applicant (resubmitting overwrites it, RN-01). On cleared, d_users.aptitude_status advances so
// the rest of the signup gate treats the applicant as cleared from here on.
export async function submitQuestionnaire(
  input: SubmitQuestionnaireInput,
  evaluateAptitude: EvaluateAptitude = defaultEvaluateAptitude,
): Promise<SubmitQuestionnaireResult> {
  const user = await repository.findById(input.userId);
  if (!user || user.aptitudeStatus !== 'pending') return { status: 'unavailable' };

  const evaluation = await evaluateAptitude(input.answers);
  const aiResult = evaluation.ok ? evaluation.data.verdict : 'pending_retry';
  const aiNotes = evaluation.ok ? evaluation.data.notes : 'AI evaluation unavailable; will be re-checked.';

  await repository.upsertQuestionnaire({ userId: input.userId, answers: input.answers, aiResult, aiNotes });
  if (aiResult === 'cleared') await repository.setAptitudeStatus(input.userId, 'cleared');

  return { status: deriveOutcome(aiResult) };
}

export type RecheckResult = { status: AptitudeOutcome } | { status: 'not_pending_retry' } | { status: 'unavailable' };

// FR-4: re-evaluates only a questionnaire whose latest result is pending_retry - there is no
// background retry job, so this only ever runs when the applicant reopens the page or asks explicitly.
export async function recheck(
  input: RecheckInput,
  evaluateAptitude: EvaluateAptitude = defaultEvaluateAptitude,
): Promise<RecheckResult> {
  const user = await repository.findById(input.userId);
  if (!user || user.aptitudeStatus !== 'pending') return { status: 'unavailable' };

  const questionnaire = await repository.findQuestionnaireByUserId(input.userId);
  if (!questionnaire || questionnaire.aiResult !== 'pending_retry') return { status: 'not_pending_retry' };

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
      status: AptitudeOutcome | 'not_submitted';
      questionnaireResult: 'cleared' | 'not_cleared' | 'pending_retry' | null;
      certificateResult: null;
    };

// So a returning applicant resumes in the right signup step. certificateResult is always null for now:
// the certificates table belongs to P-10, which doesn't exist yet.
export async function getAptitudeStatus(input: GetAptitudeStatusInput): Promise<AptitudeStatusResult> {
  const user = await repository.findById(input.userId);
  if (!user) return { status: 'unavailable' };

  const questionnaire = await repository.findQuestionnaireByUserId(input.userId);
  if (!questionnaire) return { status: 'not_submitted', questionnaireResult: null, certificateResult: null };

  return {
    status: deriveOutcome(questionnaire.aiResult),
    questionnaireResult: questionnaire.aiResult,
    certificateResult: null,
  };
}
