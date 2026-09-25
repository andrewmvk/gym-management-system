import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';

// Next only reads .env files next to the app; the monorepo keeps a single one at the root.
const rootEnvFile = resolve(process.cwd(), '../../.env');
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

const nextConfig: NextConfig = {
  transpilePackages: ['@cadence/shared'],
  // apps/web/AGENTS.md is a hand-edited copy of Next's generated block; regenerating would overwrite it.
  agentRules: false,
};

export default nextConfig;
