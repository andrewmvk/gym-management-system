import type { AiPurpose } from '@api/modules/ai/types';

export function mockFixtureFor(purpose: AiPurpose): unknown {
  switch (purpose) {
    case 'plan':
      // Empty on purpose: plan generation falls back to its deterministic placeholder in mock mode.
      return { exercises: [] };
    case 'chat':
      return { reply: 'Mock reply: noted. Your coach AI is running in mock mode.', facts: [] };
  }
}
