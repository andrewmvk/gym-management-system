'use client';

import { type ReactNode, Suspense, use } from 'react';
import { SessionReadyContext } from '@/components/auth-guard';
import { Deferred } from '@/components/deferred';

interface GuardedContentProps {
  skeleton: ReactNode;
  children: ReactNode;
}

// Children aren't mounted until the session is confirmed, so their data queries never run unauthenticated.
// The Suspense boundary is what `useUrlState` (useSearchParams) needs to prerender the rest of the page.
export function GuardedContent({ skeleton, children }: GuardedContentProps) {
  const fallback = <Deferred>{skeleton}</Deferred>;
  return use(SessionReadyContext) ? <Suspense fallback={fallback}>{children}</Suspense> : fallback;
}
