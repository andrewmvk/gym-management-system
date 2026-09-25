'use client';

import { use, type ReactNode } from 'react';
import { SessionReadyContext } from '@/components/auth-guard';

interface GuardedContentProps {
  skeleton: ReactNode;
  children: ReactNode;
}

// Children aren't mounted until the session is confirmed, so their data queries never run unauthenticated.
export function GuardedContent({ skeleton, children }: GuardedContentProps) {
  return use(SessionReadyContext) ? children : skeleton;
}
