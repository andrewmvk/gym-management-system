'use client';

import { createAppAbility, type Action, type Subject } from '@cadence/shared/auth';
import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useEffect, useMemo, type ReactNode } from 'react';
import { AbilityProvider } from '@/abilities';
import { PageMessage } from '@/components/page-message';
import { Button } from '@/components/ui/button';
import { homePathFor, loginPathFor } from '@/lib/routes';
import { useTRPC } from '@/lib/trpc';

// False while the session is unknown or a redirect is on its way; pages read it through GuardedContent.
export const SessionReadyContext = createContext(false);

interface AuthGuardProps {
  action: Action;
  subject: Subject;
  children: ReactNode;
}

export function AuthGuard({ action, subject, children }: AuthGuardProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const pathname = usePathname();
  const me = useQuery(trpc.auth.me.queryOptions());

  const rules = me.data?.rules;
  const ability = useMemo(() => createAppAbility(rules), [rules]);

  const isSignedIn = me.isSuccess && me.data !== null;
  const isAllowed = isSignedIn && ability.can(action, subject);
  const fallbackPath = isSignedIn ? homePathFor(ability) : null;

  let redirectTo: string | null = null;
  if (me.isSuccess && !isSignedIn) redirectTo = loginPathFor(pathname);
  else if (isSignedIn && !isAllowed) redirectTo = fallbackPath;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  // The page itself decides what "not ready yet" looks like (its own skeleton), so the guard never draws one.
  if (me.isPending || redirectTo) {
    return <SessionReadyContext value={false}>{children}</SessionReadyContext>;
  }

  if (me.isError) {
    return (
      <PageMessage title="We couldn't check your session.">
        <Button variant="outline" onClick={() => me.refetch()}>
          Try again
        </Button>
      </PageMessage>
    );
  }

  if (!isAllowed) {
    return <PageMessage title="Your account has no access to this app yet." />;
  }

  return (
    <AbilityProvider value={ability}>
      <SessionReadyContext value={true}>{children}</SessionReadyContext>
    </AbilityProvider>
  );
}
