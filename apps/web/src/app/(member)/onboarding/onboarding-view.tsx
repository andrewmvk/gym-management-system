'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon, BadgeCheckIcon, SparklesIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { OnboardingForm } from '@/app/(member)/onboarding/onboarding-form';
import { Deferred } from '@/components/deferred';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MEMBER_HOME_PATH } from '@/lib/routes';
import { useTRPC } from '@/lib/trpc';

type View = 'form' | 'summary' | 'submitted';

function StatusPanel({ icon, title, description, actions }: { icon: ReactNode; title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-5 sm:flex-row sm:items-center sm:p-6">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">{icon}</span>
      <div className="flex flex-1 flex-col gap-1">
        <p className="font-display text-xl font-bold tracking-wide uppercase">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

function OnboardingViewSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-5 sm:flex-row sm:items-center sm:p-6">
      <Skeleton className="size-12 shrink-0 rounded-md" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-10 w-48 rounded-md" />
    </div>
  );
}

function OnboardingViewRoot() {
  const trpc = useTRPC();
  const status = useQuery(trpc.onboarding.getStatus.queryOptions());
  const [view, setView] = useState<View | null>(null);

  // Seeds the view once from the server: a member with no submission yet goes straight to the form,
  // one who already has at least one sees a summary first (P-11 doesn't prefill an update, though -
  // "update my information" opens a blank form for a new submission, not an edit of the last one).
  useEffect(() => {
    if (status.data && view === null) setView(status.data.completed ? 'summary' : 'form');
  }, [status.data, view]);

  if (status.isError) {
    return (
      <QueryError
        title="We couldn't load your profile"
        onRetry={() => status.refetch()}
        isRetrying={status.isRefetching}
      />
    );
  }
  if (status.isPending || view === null) {
    return (
      <Deferred>
        <OnboardingViewSkeleton />
      </Deferred>
    );
  }

  if (view === 'submitted') {
    return (
      <StatusPanel
        icon={<SparklesIcon className="size-6" />}
        title="Thanks, got it"
        description="Your plan is being prepared. This can take a moment."
        actions={
          <Button asChild>
            <Link href={MEMBER_HOME_PATH}>
              Go to today
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        }
      />
    );
  }

  if (view === 'summary') {
    return (
      <StatusPanel
        icon={<BadgeCheckIcon className="size-6" />}
        title="You're all set"
        description={
          status.data.lastSubmittedAt
            ? `Last updated ${new Date(status.data.lastSubmittedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}. Each update is saved as a new entry.`
            : 'Your health profile is on file.'
        }
        actions={
          <Button variant="outline" onClick={() => setView('form')}>
            Add an update
          </Button>
        }
      />
    );
  }

  return (
    <OnboardingForm
      isUpdate={status.data.completed}
      onSubmitted={() => setView('submitted')}
      onCancel={status.data.completed ? () => setView('summary') : undefined}
    />
  );
}

export const OnboardingView = Object.assign(OnboardingViewRoot, { Skeleton: OnboardingViewSkeleton });
