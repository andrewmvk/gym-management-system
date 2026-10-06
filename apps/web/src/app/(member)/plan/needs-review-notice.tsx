'use client';

import { TriangleAlertIcon } from 'lucide-react';
import { useRebuildPlan } from '@/app/(member)/plan/use-rebuild-plan';
import { AiButton } from '@/components/ai-button';
import { cn } from '@/lib/utils';

interface NoticeExercise {
  id: string;
  exerciseName: string;
  isPerformable: boolean;
  equipmentDown: readonly string[];
}

interface NeedsReviewNoticeProps {
  exercises: readonly NoticeExercise[];
  // Only today's plan can be rebuilt from here; a day ahead is changed through the coach.
  canRebuild?: boolean;
  className?: string;
}

// Pace Tape means "look at this": a plan with an exercise that cannot be done is flagged for the trainers
// too, and the member can skip the wait by rebuilding it from what is available.
export function NeedsReviewNotice({ exercises, canRebuild = true, className }: NeedsReviewNoticeProps) {
  const rebuild = useRebuildPlan({ successMessage: "Your plan was rebuilt without what can't be done." });
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
      {canRebuild && (
        <AiButton
          variant="outline"
          className="shrink-0"
          isPending={rebuild.isPending}
          pendingLabel="Rebuilding..."
          onClick={rebuild.requestRebuild}
        >
          Rebuild today without them
        </AiButton>
      )}
      {rebuild.dialog}
    </section>
  );
}
