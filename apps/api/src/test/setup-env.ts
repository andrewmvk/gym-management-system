import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Runs before any test file imports @api/config/env, so every module sees the test database as DATABASE_URL.
const rootEnvFile = fileURLToPath(new URL('../../../../.env', import.meta.url));
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
process.env.NODE_ENV = 'test';
// Deterministic and network-free regardless of the shared .env's own AI_MODE (which may be "live" for
// real local development): every test uses the AI mock switches instead. A test that specifically wants
// to exercise the real AI call path injects its own evaluator/generator per call (aptitude and plans
// services both support this) rather than relying on this default.
process.env.AI_MODE = 'mock';
