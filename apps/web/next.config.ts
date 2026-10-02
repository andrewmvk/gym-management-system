import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';

// Next only reads .env files next to the app; the monorepo keeps a single one at the root.
const rootEnvFile = resolve(process.cwd(), '../../.env');
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

const nextConfig: NextConfig = {
  transpilePackages: ['@cadence/shared'],
  // The kiosk panel sends the key from the browser by design (docs/04-architecture.md §5), so it is inlined.
  env: { NEXT_PUBLIC_KIOSK_API_KEY: process.env.KIOSK_API_KEY ?? '' },
  // apps/web/AGENTS.md is a hand-edited copy of Next's generated block; regenerating would overwrite it.
  agentRules: false,
};

export default nextConfig;
