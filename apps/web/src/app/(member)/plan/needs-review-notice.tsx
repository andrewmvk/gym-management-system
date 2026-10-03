'use client';

import { SparklesIcon, TriangleAlertIcon } from 'lucide-react';
import { useRebuildPlan } from '@/app/(member)/plan/use-rebuild-plan';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NoticeExercise {
  id: string;
  exerciseName: string;
  isPerformable: boolean;
  equipmentDown: readonly string[];
}

interface NeedsReviewNoticeProps {
  exercises: readonly NoticeExercise[];
  planStatus: 'ai_published' | 'trainer_edited';
  hasCompleted: boolean;
  className?: string;
}

// Pace Tape means "look at this": a plan with an exercise that cannot be done is flagged for the trainers
// too, and the member can skip the wait by rebuilding it from what is available.
export function NeedsReviewNotice({ exercises, planStatus, hasCompleted, className }: NeedsReviewNoticeProps) {
  const rebuild = useRebuildPlan({
    planStatus,
    hasCompleted,
    successMessage: "Your plan was rebuilt without what can't be done.",
  });
  const blocked = exercises.filter((exercise) => !exercise.isPerformable);

  return (
    <section
      aria-label="Plan needs a review"
      className={cn(
        'flex flex-col gap-4 bg-tape px-5 py-4 text-tape-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6',
        className,
      )}
    >
      <div className="flex min-w-0 gap-3">
        <TriangleAlertIcon className="mt-1 size-5 shrink-0" aria-hidden />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-display text-xl font-bold tracking-wide uppercase">This plan needs a review</h2>
          <p className="text-sm text-pretty">
            {blocked.length === 1 ? "1 exercise can't" : `${blocked.length} exercises can't`} be done right now, so your
            trainers see this plan flagged.
          </p>
          <ul className="flex flex-col text-sm">
            {blocked.map((exercise) => (
              <li key={exercise.id}>
                <span className="font-semibold">{exercise.exerciseName}</span>
                {exercise.equipmentDown.length > 0 &&
                  `: ${exercise.equipmentDown.join(', ')} ${exercise.equipmentDown.length === 1 ? 'is' : 'are'} out of service`}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Button variant="outline" className="shrink-0" disabled={rebuild.isPending} onClick={rebuild.requestRebuild}>
        <SparklesIcon data-icon="inline-start" />
        {rebuild.isPending ? 'Rebuilding...' : 'Rebuild today without them'}
      </Button>
      {rebuild.dialog}
    </section>
  );
}
