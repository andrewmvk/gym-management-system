import type { AppRouter } from '@cadence/api';
import { createTRPCClient, httpBatchStreamLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import { API_URL } from '@/lib/env';

export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

// The stream link answers ordinary calls like the batch link and also carries the procedures that yield
// results as they are ready (the coach reply, a plan being built).
export function createTrpcClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchStreamLink({
        url: `${API_URL}/trpc`,
        fetch: (url, options) => fetch(url, { ...options, credentials: 'include' }),
      }),
    ],
  });
}
