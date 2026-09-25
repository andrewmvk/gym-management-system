import type { AiPurpose, MockVerdict } from '@api/modules/ai/types';

export interface MockSwitches {
  aptitude: MockVerdict;
  certificate: MockVerdict;
}

const VERDICT_NOTES = {
  cleared: 'Mock evaluation: no contraindication found.',
  not_cleared: 'Mock evaluation: a medical certificate is required before training.',
} as const;

// null means the mock simulates a technical failure for that purpose.
export function mockFixtureFor(purpose: AiPurpose, switches: MockSwitches): unknown {
  switch (purpose) {
    case 'aptitude':
    case 'certificate': {
      const verdict = switches[purpose];
      return verdict === 'unavailable' ? null : { verdict, notes: VERDICT_NOTES[verdict] };
    }
    case 'plan':
      // Empty on purpose: plan generation falls back to its deterministic placeholder in mock mode.
      return { exercises: [] };
    case 'chat':
      return { reply: 'Mock reply: noted. Your coach AI is running in mock mode.', facts: [] };
  }
}
