import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Runs before any test file imports @api/config/env, so every module sees the test database as DATABASE_URL.
const rootEnvFile = fileURLToPath(new URL('../../../../.env', import.meta.url));
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
process.env.NODE_ENV = 'test';
// Deterministic and network-free regardless of the shared .env's AI_MODE: any test that wants the
// real AI path for plan generation overrides it explicitly per call (plans/service.test.ts).
process.env.PLAN_GENERATOR = 'placeholder';
