import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { NextConfig } from 'next';

// Next only reads .env files next to the app; the monorepo keeps a single one at the root.
const rootEnvFile = resolve(process.cwd(), '../../.env');
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

const apiProxyTarget = process.env.API_PROXY_TARGET;

const nextConfig: NextConfig = {
  transpilePackages: ['@cadence/shared'],
  // The kiosk panel sends the key from the browser by design (docs/04-architecture.md §5), so it is inlined.
  env: { NEXT_PUBLIC_KIOSK_API_KEY: process.env.KIOSK_API_KEY ?? '' },
  // apps/web/AGENTS.md is a hand-edited copy of Next's generated block; regenerating would overwrite it.
  agentRules: false,
  // Every browser on iOS runs on Safari's WebKit and blocks a session cookie set by a different registrable
  // domain, even with SameSite=None. The public deployment (docs/10-deployment.md) proxies the API through this
  // same origin instead, so the cookie is first-party; API_PROXY_TARGET is unset locally, where frontend and API
  // already share a site, so this is a no-op there.
  async rewrites() {
    if (!apiProxyTarget) return [];
    return [
      { source: '/trpc/:path*', destination: `${apiProxyTarget}/trpc/:path*` },
      { source: '/files/:path*', destination: `${apiProxyTarget}/files/:path*` },
      { source: '/kiosk/:path*', destination: `${apiProxyTarget}/kiosk/:path*` },
    ];
  },
};

export default nextConfig;
