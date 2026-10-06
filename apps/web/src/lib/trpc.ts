import type { AppRouter } from '@cadence/api';
import { createTRPCClient, httpBatchLink, httpBatchStreamLink, splitLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import { API_URL } from '@/lib/env';

export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

// The stream link sends the response headers before any procedure has run, so a procedure that sets or clears
// the session cookie cannot go through it.
const COOKIE_PROCEDURES = ['auth.login', 'auth.register', 'auth.logout'];

// The stream link answers ordinary calls like the batch link and also carries the procedures that yield
// results as they are ready (the coach reply, a plan being built).
export function createTrpcClient() {
  const linkOptions = {
    url: `${API_URL}/trpc`,
    fetch: (url: URL | RequestInfo, options?: RequestInit) => fetch(url, { ...options, credentials: 'include' }),
  };

  return createTRPCClient<AppRouter>({
    links: [
      splitLink({
        condition: (operation) => COOKIE_PROCEDURES.includes(operation.path),
        true: httpBatchLink(linkOptions),
        false: httpBatchStreamLink(linkOptions),
      }),
    ],
  });
}
