'use client';

import { muscleLabel } from '@cadence/shared/schemas/muscles';
import { useQuery } from '@tanstack/react-query';
import { CheckIcon, DumbbellIcon, TriangleAlertIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PlanBuildProgress } from '@/app/(member)/plan/plan-build-progress';
import { useRebuildPlan } from '@/app/(member)/plan/use-rebuild-plan';
import { useToggleExercise } from '@/app/(member)/plan/use-toggle-exercise';
import { AiButton } from '@/components/ai-button';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatWeight } from '@/lib/format';
import { useTRPC } from '@/lib/trpc';

function CardShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <section aria-label="Next up" className="overflow-hidden rounded-lg border bg-card">
      {children}
      {footer}
    </section>
  );
}

function NextUpCardSkeleton() {
  return (
    <CardShell
      footer={
        <div className="border-t bg-muted/60 px-5 py-4 sm:px-6">
          <Skeleton className="h-12 w-full sm:w-56" />
        </div>
      }
    >
      <div className="flex flex-col gap-4 px-5 py-5 sm:px-6">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-18 w-40" />
        <Skeleton className="h-5 w-32" />
      </div>
    </CardShell>
  );
}

function NextUpCardRoot() {
  const trpc = useTRPC();
  const todayQuery = useQuery(trpc.plans.getToday.queryOptions());
  const toggle = useToggleExercise();
  const generate = useRebuildPlan({ isErrorInline: true });

  if (todayQuery.isPending) {
    return (
      <Deferred>
        <NextUpCardSkeleton />
      </Deferred>
    );
  }

  if (todayQuery.isError) {
    return (
      <QueryError
        title="We couldn't load today's plan"
        onRetry={() => todayQuery.refetch()}
        isRetrying={todayQuery.isRefetching}
      />
    );
  }

  const plan = todayQuery.data;

  if (!plan) {
    return (
      <CardShell>
        {generate.isError ? (
          <QueryError
            title="We couldn't build your plan right now"
            onRetry={generate.requestRebuild}
            className="m-5 sm:m-6"
          />
        ) : (
          <EmptyState
            icon={DumbbellIcon}
            title="No plan yet for today"
            description="Your plan is built from your health profile and everything you've told your coach."
            action={
              <AiButton
                size="lg"
                isPending={generate.isPending}
                pendingLabel="Building your plan..."
                onClick={generate.requestRebuild}
              >
                Build my plan
              </AiButton>
            }
          />
        )}
        {generate.isPending && generate.streamed.length > 0 && <PlanBuildProgress exercises={generate.streamed} />}
        {generate.dialog}
      </CardShell>
    );
  }

  const undone = plan.exercises.filter((exercise) => !exercise.completed);
  const next = undone.find((exercise) => exercise.isPerformable);

  if (plan.exercises.length === 0 || undone.length === 0) {
    return (
      <CardShell>
        <EmptyState
          icon={CheckIcon}
          title={plan.exercises.length === 0 ? 'Nothing planned today' : 'All done. Nice work.'}
          description={
            plan.exercises.length === 0
              ? 'Your plan has no exercises. Your coach can build one with you.'
              : "Every exercise in today's plan is ticked off."
          }
          action={
            <Button asChild variant="outline">
              <Link href="/plan">See my plan</Link>
            </Button>
          }
        />
      </CardShell>
    );
  }

  if (!next) {
    return (
      <CardShell>
        <EmptyState
          icon={TriangleAlertIcon}
          title="What's left can't be done now"
          description="The exercises still on your list need equipment that is out of service. See the notice above to rebuild your plan."
        />
      </CardShell>
    );
  }

  const position = plan.exercises.findIndex((exercise) => exercise.id === next.id) + 1;
  const primary = next.muscles.filter((entry) => entry.role === 'primary').map((entry) => muscleLabel(entry.muscle));

  return (
    <CardShell
      footer={
        <div className="border-t bg-muted/60 px-5 py-4 sm:px-6">
          <Button
            size="lg"
            className="h-12 w-full text-lg sm:w-auto sm:min-w-56"
            disabled={toggle.isPending}
            onClick={() => toggle.mutate({ planExerciseId: next.id, completed: true })}
          >
            <CheckIcon data-icon="inline-start" />
            Done
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 px-5 py-5 sm:px-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-xl font-bold tracking-wide uppercase">Next up</h2>
          <p className="numerals text-xl font-bold text-muted-foreground">
            {position}
            <span>/{plan.exercises.length}</span>
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-display text-3xl leading-none font-extrabold text-balance uppercase sm:text-4xl">
            {next.exerciseName}
          </p>
          {primary.length > 0 && (
            <p className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {primary.join(', ')}
            </p>
          )}
        </div>
        <p className="numerals text-7xl leading-none font-extrabold">
          {next.sets}
          <span className="px-1 text-muted-foreground">&times;</span>
          {next.reps}
          {next.load ? (
            <span className="mt-2 block text-2xl font-bold text-muted-foreground">{formatWeight(next.load)}</span>
          ) : null}
        </p>
        <details>
          <summary className="flex min-h-11 w-fit items-center text-sm font-semibold underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/45">
            How to do it
          </summary>
          <p className="max-w-prose text-sm text-pretty text-muted-foreground">{next.instructions}</p>
          {next.notes && (
            <p className="mt-3 max-w-prose rounded-sm bg-accent/60 px-3 py-2 text-sm text-pretty">
              <span className="font-semibold">Note: </span>
              {next.notes}
            </p>
          )}
        </details>
      </div>
    </CardShell>
  );
}

export const NextUpCard = Object.assign(NextUpCardRoot, { Skeleton: NextUpCardSkeleton });
