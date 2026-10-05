'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon, SparklesIcon } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';
import { CurrentProfile } from '@/app/(member)/onboarding/current-profile';
import { OnboardingForm, type OnboardingInitialValues } from '@/app/(member)/onboarding/onboarding-form';
import { RememberedFacts } from '@/app/(member)/onboarding/remembered-facts';
import { type PlanOutcome, useOnboardingSubmit } from '@/app/(member)/onboarding/use-onboarding-submit';
import { PlanBuildProgress, type StreamedPlanExercise } from '@/app/(member)/plan/plan-build-progress';
import { useRebuildPlan } from '@/app/(member)/plan/use-rebuild-plan';
import { AiMark } from '@/components/ai-mark';
import { Deferred } from '@/components/deferred';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MEMBER_HOME_PATH } from '@/lib/routes';
import { useTRPC } from '@/lib/trpc';

type View = 'form' | 'summary' | 'submitted';

function StatusPanel({
  icon,
  title,
  description,
  actions,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-5 sm:flex-row sm:items-center sm:p-6">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
        {icon}
      </span>
      <div className="flex flex-1 flex-col gap-1">
        <p className="font-display text-xl font-bold tracking-wide uppercase">{title}</p>
        <p className="text-sm text-pretty text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

function StatusPanelSkeleton() {
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

function ProfileLayout({ profile, facts }: { profile: ReactNode; facts: ReactNode }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-5">
      <div className="min-w-0 lg:col-span-2">{profile}</div>
      <div className="min-w-0 lg:col-span-3">{facts}</div>
    </div>
  );
}

function OnboardingViewSkeleton() {
  return <ProfileLayout profile={<CurrentProfile.Skeleton />} facts={<RememberedFacts.Skeleton />} />;
}

// The submit saved the information and then tried to build the plan. While it writes, the exercises stream in.
// If it failed and there is no plan, the member sees a failure with a retry, never a finished onboarding.
function SubmittedPanel({
  isUpdate,
  outcome,
  streamed,
}: {
  isUpdate: boolean;
  outcome: PlanOutcome;
  streamed: StreamedPlanExercise[];
}) {
  const trpc = useTRPC();
  const todayQuery = useQuery({ ...trpc.plans.getToday.queryOptions(), enabled: outcome !== 'building' });
  const rebuild = useRebuildPlan({ isErrorInline: true });

  if (outcome === 'building' || outcome === 'idle' || rebuild.isPending) {
    const exercises = rebuild.isPending ? rebuild.streamed : streamed;
    return (
      <div className="flex flex-col gap-4">
        <StatusPanel
          icon={<AiMark isActive className="size-6" />}
          title="Building your plan"
          description="Your information is saved. Your coach is writing today's plan from it, and each exercise appears as it is ready."
        />
        {exercises.length > 0 && <PlanBuildProgress exercises={exercises} className="rounded-lg border bg-card" />}
      </div>
    );
  }

  if (todayQuery.isPending || (todayQuery.isFetching && todayQuery.data === null)) {
    return (
      <Deferred>
        <StatusPanelSkeleton />
      </Deferred>
    );
  }

  if (todayQuery.isError) {
    return (
      <QueryError
        title="We couldn't check your plan"
        onRetry={() => todayQuery.refetch()}
        isRetrying={todayQuery.isRefetching}
      />
    );
  }

  if (todayQuery.data === null) {
    return (
      <>
        <QueryError
          title="We couldn't build your plan right now"
          onRetry={rebuild.requestRebuild}
          isRetrying={rebuild.isPending}
        />
        {rebuild.dialog}
      </>
    );
  }

  return (
    <StatusPanel
      icon={<SparklesIcon className="size-6" />}
      title="Thanks, got it"
      description={
        outcome === 'kept'
          ? "Your update is saved and your coach uses it from now on. Today's plan was kept as it is, because you already ticked exercises or a trainer edited it. You can rebuild it from My plan."
          : outcome === 'failed'
            ? "Your information is saved and your coach uses it from now on. Today's plan could not be rebuilt right now. You can rebuild it from My plan."
            : isUpdate
              ? "Your update is saved and your coach uses it from now on. Today's plan was rebuilt from it. You can rebuild it again from My plan."
              : 'Your health profile is saved and your first plan is ready.'
      }
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

function OnboardingViewRoot() {
  const trpc = useTRPC();
  const status = useQuery(trpc.onboarding.getStatus.queryOptions());
  const submissions = useQuery(trpc.onboarding.listMine.queryOptions());
  const [view, setView] = useState<View | null>(null);
  const [wasUpdate, setWasUpdate] = useState(false);
  const submit = useOnboardingSubmit({
    onSaved: () => {
      setWasUpdate(status.data?.completed ?? false);
      setView('submitted');
    },
  });

  // Seeds the view once from the server: a member with no submission yet goes straight to the form,
  // one who already has at least one sees what the coach knows first and can update from there.
  useEffect(() => {
    if (status.data && view === null) setView(status.data.completed ? 'summary' : 'form');
  }, [status.data, view]);

  if (status.isError || submissions.isError) {
    return (
      <QueryError
        title="We couldn't load your profile"
        onRetry={() => {
          status.refetch();
          submissions.refetch();
        }}
        isRetrying={status.isRefetching || submissions.isRefetching}
      />
    );
  }
  if (status.isPending || submissions.isPending || view === null) {
    return (
      <Deferred>
        <OnboardingViewSkeleton />
      </Deferred>
    );
  }

  if (view === 'submitted') {
    return <SubmittedPanel isUpdate={wasUpdate} outcome={submit.outcome} streamed={submit.streamed} />;
  }

  if (view === 'summary') {
    return <ProfileLayout profile={<CurrentProfile onUpdate={() => setView('form')} />} facts={<RememberedFacts />} />;
  }

  const latest = submissions.data[0];
  const initialValues: OnboardingInitialValues | undefined = latest
    ? {
        heightCm: latest.heightCm,
        weightKg: latest.weightKg,
        goals: latest.goals,
        medications: latest.medications,
        conditions: latest.physicalConditions.conditions,
        otherNotes: latest.physicalConditions.otherNotes,
        exams: latest.exams,
      }
    : undefined;

  return (
    <OnboardingForm
      isUpdate={status.data.completed}
      initialValues={initialValues}
      isSubmitting={submit.isPending}
      onSubmit={submit.start}
      onCancel={status.data.completed ? () => setView('summary') : undefined}
    />
  );
}

export const OnboardingView = Object.assign(OnboardingViewRoot, { Skeleton: OnboardingViewSkeleton });
