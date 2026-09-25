import { env } from '@api/config/env';
import { logger } from '@api/lib/logger';
import { createAiRunner } from '@api/modules/ai/structured-runner';

export { AI_REQUEST_TIMEOUT_MS } from '@api/modules/ai/client';
export { createAiRunner, type AiRunner, type AiRunnerConfig } from '@api/modules/ai/structured-runner';
export * from '@api/modules/ai/types';

const log = logger.child({ module: 'ai' });

// The env loader guarantees the key and model whenever AI_MODE is live.
const runner =
  env.AI_MODE === 'mock'
    ? createAiRunner({ mode: 'mock', mock: { aptitude: env.AI_MOCK_APTITUDE, certificate: env.AI_MOCK_CERTIFICATE }, log })
    : createAiRunner({ mode: 'live', apiKey: env.OPENROUTER_API_KEY!, model: env.OPENROUTER_MODEL!, log });

export const runStructured = runner.runStructured;
