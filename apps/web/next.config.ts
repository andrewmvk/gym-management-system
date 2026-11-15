import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';

// Next only reads .env files next to the app; the monorepo keeps a single one at the root.
const rootEnvFile = resolve(process.cwd(), '../../.env');
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';
const API_PATHS = ['trpc', 'files', 'kiosk'];
const PROXY_TIMEOUT_MS = 120_000;

const nextConfig: NextConfig = {
  transpilePackages: ['@cadence/shared'],
  // The kiosk panel sends the key from the browser by design (docs/04-architecture.md §5), so it is inlined.
  env: { NEXT_PUBLIC_KIOSK_API_KEY: process.env.KIOSK_API_KEY ?? '' },
  // apps/web/AGENTS.md is a hand-edited copy of Next's generated block; regenerating would overwrite it.
  agentRules: false,
  experimental: { proxyTimeout: PROXY_TIMEOUT_MS },
  async rewrites() {
    return API_PATHS.map((path) => ({ source: `/${path}/:path*`, destination: `${apiProxyTarget}/${path}/:path*` }));
  },
};

export default nextConfig;
