'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { use, useEffect, type ReactNode } from 'react';
import { SessionReadyContext } from '@/components/auth-guard';
import { useTRPC } from '@/lib/trpc';

const ONBOARDING_PATH = '/onboarding';

// FR-11: a member who hasn't completed onboarding can't reach any other member page. Runs only once
// AuthGuard confirms a signed-in member (SessionReadyContext), so it never races the sign-in redirect,
// and never redirects away from the onboarding page itself.
export function OnboardingGate({ children }: { children: ReactNode }) {
  const ready = use(SessionReadyContext);
  const trpc = useTRPC();
  const router = useRouter();
  const pathname = usePathname();

  const status = useQuery({ ...trpc.onboarding.getStatus.queryOptions(), enabled: ready });
  const needsRedirect = ready && status.data?.completed === false && pathname !== ONBOARDING_PATH;

  useEffect(() => {
    if (needsRedirect) router.replace(ONBOARDING_PATH);
  }, [needsRedirect, router]);

  if (needsRedirect) return null;
  return children;
}
