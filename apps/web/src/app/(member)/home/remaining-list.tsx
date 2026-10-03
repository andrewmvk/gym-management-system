'use client';

import { useQuery } from '@tanstack/react-query';
import { Deferred } from '@/components/deferred';
import { PanelSection } from '@/components/panel-section';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

const SKELETON_ROWS = 4;

function RemainingListSkeleton() {
  return (
    <PanelSection title="Today's list">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
        <div key={index} className="flex min-h-12 items-center gap-3 border-b px-5 last:border-b-0 sm:px-6">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-5 w-48" />
        </div>
      ))}
    </PanelSection>
  );
}

// The queue behind the next exercise: done ones are struck, the one to do now is marked, and an exercise
// that cannot be done is struck with its own badge.
function RemainingListRoot() {
  const trpc = useTRPC();
  const todayQuery = useQuery(trpc.plans.getToday.queryOptions());

  if (todayQuery.isPending) {
    return (
      <Deferred>
        <RemainingListSkeleton />
      </Deferred>
    );
  }

  const plan = todayQuery.data;
  if (!plan || plan.exercises.length === 0) return null;

  const nextId = plan.exercises.find((exercise) => !exercise.completed && exercise.isPerformable)?.id;

  return (
    <PanelSection title="Today's list">
      <ol>
        {plan.exercises.map((exercise, index) => (
          <li
            key={exercise.id}
            data-done={exercise.completed}
            className={cn(
              'flex min-h-12 items-center gap-3 border-b px-5 py-2 last:border-b-0 sm:px-6',
              exercise.id === nextId && 'bg-accent/60',
            )}
          >
            <span className="numerals w-6 shrink-0 text-xl leading-none font-bold text-muted-foreground">
              {index + 1}
            </span>
            <span
              className={cn(
                'strike-wipe min-w-0 flex-1 truncate font-semibold',
                (exercise.completed || !exercise.isPerformable) && 'text-muted-foreground',
                !exercise.isPerformable && 'line-through decoration-2',
              )}
            >
              {exercise.exerciseName}
            </span>
            {exercise.id === nextId && <Badge>Next</Badge>}
            {!exercise.isPerformable && <Badge variant="unavailable">Out of service</Badge>}
            <span className="sr-only">{exercise.completed ? 'Done' : 'Not done'}</span>
          </li>
        ))}
      </ol>
    </PanelSection>
  );
}

export const RemainingList = Object.assign(RemainingListRoot, { Skeleton: RemainingListSkeleton });
