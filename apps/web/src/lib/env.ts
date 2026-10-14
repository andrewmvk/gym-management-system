const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// "" is a deliberate value, not a missing one: it means the API is reachable through this same origin, via the
// next.config.ts rewrite proxy the public deployment uses (docs/10-deployment.md) instead of a direct cross-site
// call, so every API path below resolves relative to the page instead of an absolute Render URL.
if (apiUrl === undefined) {
  throw new Error('Invalid environment configuration: NEXT_PUBLIC_API_URL is missing');
}

export const API_URL = apiUrl;
