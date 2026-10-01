import {
  type AdminResult,
  type AptitudeStatus,
  resolveAptitudeStatus,
  type Verdict,
} from '@api/modules/aptitude/resolve-aptitude-status';
import { describe, expect, it } from 'vitest';

const VERDICTS: (Verdict | null)[] = ['cleared', 'not_cleared', 'pending_retry', null];
const ADMIN_RESULTS: (AdminResult | null)[] = ['cleared', 'not_cleared', null];

describe('resolveAptitudeStatus', () => {
  it('never changes anything once the applicant already has a password', () => {
    for (const questionnaireResult of VERDICTS) {
      for (const certificateResult of VERDICTS) {
        for (const adminResult of ADMIN_RESULTS) {
          expect(
            resolveAptitudeStatus({ questionnaireResult, certificateResult, adminResult, hasPassword: true }),
          ).toBeNull();
        }
      }
    }
  });

  it('clears immediately on an AI-cleared questionnaire, regardless of certificate state', () => {
    for (const certificateResult of VERDICTS) {
      for (const adminResult of ADMIN_RESULTS) {
        expect(
          resolveAptitudeStatus({ questionnaireResult: 'cleared', certificateResult, adminResult, hasPassword: false }),
        ).toBe<AptitudeStatus>('cleared');
      }
    }
  });

  it('never finalizes from the raw certificate AI result alone, no matter which verdict', () => {
    for (const questionnaireResult of ['not_cleared', 'pending_retry', null] as const) {
      for (const certificateResult of VERDICTS) {
        expect(
          resolveAptitudeStatus({ questionnaireResult, certificateResult, adminResult: null, hasPassword: false }),
        ).toBeNull();
      }
    }
  });

  it('resolves to cleared once an admin decision is cleared', () => {
    for (const questionnaireResult of ['not_cleared', 'pending_retry', null] as const) {
      for (const certificateResult of VERDICTS) {
        expect(
          resolveAptitudeStatus({ questionnaireResult, certificateResult, adminResult: 'cleared', hasPassword: false }),
        ).toBe<AptitudeStatus>('cleared');
      }
    }
  });

  it('resolves to rejected once an admin decision is not_cleared', () => {
    for (const questionnaireResult of ['not_cleared', 'pending_retry', null] as const) {
      for (const certificateResult of VERDICTS) {
        expect(
          resolveAptitudeStatus({
            questionnaireResult,
            certificateResult,
            adminResult: 'not_cleared',
            hasPassword: false,
          }),
        ).toBe<AptitudeStatus>('rejected');
      }
    }
  });

  it('never turns pending_retry into a real decision without an admin or questionnaire-AI verdict', () => {
    expect(
      resolveAptitudeStatus({
        questionnaireResult: 'pending_retry',
        certificateResult: 'pending_retry',
        adminResult: null,
        hasPassword: false,
      }),
    ).toBeNull();
  });
});
