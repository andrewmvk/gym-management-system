import type { AppRouter } from '@cadence/api';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import { API_URL } from '@/lib/env';

export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

export function createTrpcClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${API_URL}/trpc`,
        fetch: (url, options) => fetch(url, { ...options, credentials: 'include' }),
      }),
    ],
  });
}
