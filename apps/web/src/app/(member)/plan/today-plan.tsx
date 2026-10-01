'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DumbbellIcon, SparklesIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { ExerciseRow } from '@/app/(member)/plan/exercise-row';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { QueryError } from '@/components/query-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

function PlanShell({ tally, aside, children }: { tally: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-label="Today's plan" className="overflow-hidden rounded-lg border bg-card">
      <div className="kit-corner flex items-end justify-between gap-4 bg-kit pt-4 pr-20 pb-3 pl-5 text-kit-foreground sm:pl-6">
        <div className="flex flex-col gap-1">
          <p className="font-display text-sm font-semibold tracking-widest text-kit-muted uppercase">Today&apos;s plan</p>
          {tally}
        </div>
        {aside && <div className="flex flex-col items-end gap-2 pb-1 text-right">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

function ProgressSegments({ states }: { states: boolean[] }) {
  return (
    <div
      className="grid gap-1 border-b px-5 py-3 sm:px-6"
      style={{ gridTemplateColumns: `repeat(${states.length}, minmax(0, 1fr))` }}
      aria-hidden
    >
      {states.map((isDone, index) => (
        <span
          key={index}
          className={cn('h-2 -skew-x-12 rounded-xs transition-colors duration-500', isDone ? 'bg-primary' : 'bg-muted')}
        />
      ))}
    </div>
  );
}

// h-12 is the line box of the text-5xl tally at leading-none.
function TodayPlanSkeleton() {
  return (
    <PlanShell tally={<Skeleton className="h-12 w-24 bg-white/12" />}>
      <div className="border-b px-5 py-3 sm:px-6">
        <Skeleton className="h-2 w-full" />
      </div>
      {Array.from({ length: 4 }, (_, index) => (
        <ExerciseRow.Skeleton key={index} />
      ))}
    </PlanShell>
  );
}

function TodayPlanRoot() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const todayQuery = useQuery(trpc.plans.getToday.queryOptions());

  const generate = useMutation(
    trpc.plans.generateToday.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.plans.getToday.queryKey() }),
      onError: () => toast.error("We couldn't generate your plan. Try again."),
    }),
  );

  const toggle = useMutation(
    trpc.plans.markExerciseCompleted.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: trpc.plans.getToday.queryKey() });
        const previous = queryClient.getQueryData(trpc.plans.getToday.queryKey());
        queryClient.setQueryData(trpc.plans.getToday.queryKey(), (old) =>
          old
            ? {
                ...old,
                exercises: old.exercises.map((exercise) =>
                  exercise.id === input.planExerciseId ? { ...exercise, completed: input.completed } : exercise,
                ),
              }
            : old,
        );
        return { previous };
      },
      onError: (_error, _input, context) => {
        if (context?.previous !== undefined) queryClient.setQueryData(trpc.plans.getToday.queryKey(), context.previous);
        toast.error("We couldn't update that exercise. Try again.");
      },
      onSettled: () => queryClient.invalidateQueries({ queryKey: trpc.plans.getToday.queryKey() }),
    }),
  );

  if (todayQuery.isPending) {
    return (
      <Deferred>
        <TodayPlanSkeleton />
      </Deferred>
    );
  }

  if (todayQuery.isError) {
    return (
      <PlanShell tally={<p className="numerals text-5xl leading-none font-extrabold text-kit-muted">-</p>}>
        <QueryError
          title="We couldn't load today's plan"
          onRetry={() => todayQuery.refetch()}
          isRetrying={todayQuery.isRefetching}
          className="m-5 sm:m-6"
        />
      </PlanShell>
    );
  }

  if (!todayQuery.data) {
    return (
      <PlanShell tally={<p className="numerals text-5xl leading-none font-extrabold text-kit-muted">0</p>}>
        <EmptyState
          icon={DumbbellIcon}
          title="No plan yet for today"
          description="Your plan is built from your health profile and everything you've told your coach."
          action={
            <Button size="lg" disabled={generate.isPending} onClick={() => generate.mutate({})}>
              <SparklesIcon data-icon="inline-start" />
              {generate.isPending ? 'Building your plan...' : 'Build my plan'}
            </Button>
          }
        />
      </PlanShell>
    );
  }

  const plan = todayQuery.data;
  const doneStates = plan.exercises.map((exercise) => exercise.completed);
  const doneCount = doneStates.filter(Boolean).length;
  const remaining = plan.exercises.length - doneCount;

  return (
    <PlanShell
      tally={
        <p className="numerals text-5xl leading-none font-extrabold" aria-live="polite">
          {doneCount}
          <span className="text-kit-muted">/{plan.exercises.length}</span>
          <span className="sr-only"> exercises done</span>
        </p>
      }
      aside={
        <>
          {plan.status === 'trainer_edited' && <Badge variant="tape">Edited by a trainer</Badge>}
          <p className="text-sm text-kit-muted">{remaining === 0 ? 'All done. Nice work.' : `${remaining} to go`}</p>
        </>
      }
    >
      {plan.exercises.length > 0 && <ProgressSegments states={doneStates} />}
      {plan.exercises.map((exercise, index) => (
        <ExerciseRow
          key={exercise.id}
          index={index}
          name={exercise.exerciseName}
          muscleGroup={exercise.muscleGroup}
          instructions={exercise.instructions}
          sets={exercise.sets}
          reps={exercise.reps}
          load={exercise.load}
          notes={exercise.notes}
          completed={exercise.completed}
          isPerformable={exercise.isPerformable}
          disabled={toggle.isPending}
          onToggle={(completed) => toggle.mutate({ planExerciseId: exercise.id, completed })}
        />
      ))}
    </PlanShell>
  );
}

export const TodayPlan = Object.assign(TodayPlanRoot, { Skeleton: TodayPlanSkeleton });
