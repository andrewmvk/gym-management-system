'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/trpc';
import { OnboardingForm } from './onboarding-form';

type View = 'form' | 'summary' | 'submitted';

function OnboardingViewSkeleton() {
  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  );
}

export function OnboardingView() {
  const trpc = useTRPC();
  const status = useQuery(trpc.onboarding.getStatus.queryOptions());
  const [view, setView] = useState<View | null>(null);

  // Seeds the view once from the server: a member with no submission yet goes straight to the form,
  // one who already has at least one sees a summary first (P-11 doesn't prefill an update, though -
  // "update my information" opens a blank form for a new submission, not an edit of the last one).
  useEffect(() => {
    if (status.data && view === null) setView(status.data.completed ? 'summary' : 'form');
  }, [status.data, view]);

  if (status.isPending || view === null) return <OnboardingViewSkeleton />;
  if (status.isError) {
    return (
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>We couldn&apos;t load your onboarding status.</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => status.refetch()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (view === 'submitted') {
    return (
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Thanks!</CardTitle>
          <CardDescription>Your plan is being prepared. This can take a moment.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (view === 'summary') {
    return (
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>You&apos;re all set</CardTitle>
          <CardDescription>
            {status.data?.lastSubmittedAt
              ? `Last updated ${new Date(status.data.lastSubmittedAt).toLocaleDateString()}.`
              : 'Your onboarding information is on file.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => setView('form')}>
            Update my information
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <OnboardingForm isUpdate={status.data?.completed ?? false} onSubmitted={() => setView('submitted')} />;
}
