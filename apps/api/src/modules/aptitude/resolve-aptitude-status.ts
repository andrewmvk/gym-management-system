export type Verdict = 'cleared' | 'not_cleared' | 'pending_retry';
export type AdminResult = 'cleared' | 'not_cleared';
export type AptitudeStatus = 'pending' | 'cleared' | 'rejected';

export interface ResolveAptitudeStatusInput {
  questionnaireResult: Verdict | null;
  // Raw ai_result on the certificate. Informational only: per RN-02/FR-6 every certificate result -
  // cleared, not_cleared, or pending_retry alike - goes to the admin queue, so it never finalizes
  // aptitude_status by itself. Only adminResult (below) can.
  certificateResult: Verdict | null;
  // Non-null only once an admin has actually reviewed the certificate (confirm or override) -
  // certificates.review always writes a decisive value here, never leaves it null after acting.
  adminResult: AdminResult | null;
  hasPassword: boolean;
}

// FR-8 says a member is cleared/rejected "by AI or by Admin," while FR-6/FR-7 route every certificate
// through the admin queue with confirm/override as the only actions. Read here as: the questionnaire's
// own AI-cleared verdict still finalizes immediately (P-08, unchanged) - but a certificate's AI verdict
// never finalizes on its own; only once an admin has reviewed (confirm or override) does the
// certificate path resolve to cleared/rejected. RN-03: once the applicant already has a password, a
// later review never changes anything - that window has closed.
//
// Returns null when nothing about aptitude_status should change (stays exactly as it is).
export function resolveAptitudeStatus(input: ResolveAptitudeStatusInput): AptitudeStatus | null {
  if (input.hasPassword) return null;
  if (input.questionnaireResult === 'cleared') return 'cleared';
  if (input.adminResult === 'cleared') return 'cleared';
  if (input.adminResult === 'not_cleared') return 'rejected';
  return null;
}
