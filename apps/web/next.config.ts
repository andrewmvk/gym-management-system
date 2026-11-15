import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';

// Next only reads .env files next to the app; the monorepo keeps a single one at the root.
const rootEnvFile = resolve(process.cwd(), '../../.env');
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';
// /kiosk/models/* are the face weights this app serves itself (app/kiosk/models/[file]/route.ts), so they must
// not reach the API, which answers them with a 404 and leaves the kiosk unable to recognise anyone.
const API_REWRITES = [
  { source: '/trpc/:path*', destination: '/trpc/:path*' },
  { source: '/files/:path*', destination: '/files/:path*' },
  { source: '/kiosk/:path((?!models/).*)', destination: '/kiosk/:path' },
];
const PROXY_TIMEOUT_MS = 120_000;

const nextConfig: NextConfig = {
  transpilePackages: ['@cadence/shared'],
  // The kiosk panel sends the key from the browser by design (docs/04-architecture.md §5), so it is inlined.
  env: { NEXT_PUBLIC_KIOSK_API_KEY: process.env.KIOSK_API_KEY ?? '' },
  // apps/web/AGENTS.md is a hand-edited copy of Next's generated block; regenerating would overwrite it.
  agentRules: false,
  experimental: { proxyTimeout: PROXY_TIMEOUT_MS },
  async rewrites() {
    return API_REWRITES.map(({ source, destination }) => ({ source, destination: `${apiProxyTarget}${destination}` }));
  },
};

export default nextConfig;
