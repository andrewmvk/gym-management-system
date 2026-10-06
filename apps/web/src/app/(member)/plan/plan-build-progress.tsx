import { type MuscleId, muscleLabel } from '@cadence/shared/schemas/muscles';
import { formatWeight } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface StreamedPlanExercise {
  exerciseId: string;
  name: string;
  muscles: { muscle: MuscleId; role: 'primary' | 'secondary' }[];
  sets: number;
  reps: number;
  load: number | null;
  notes: string | null;
}

interface PlanBuildProgressProps {
  exercises: readonly StreamedPlanExercise[];
  className?: string;
}

const MAX_STAGGER_STEPS = 6;
const STAGGER_MS = 60;

// The plan as the AI writes it: each exercise settles into the list the moment it is finished, so the
// member watches the plan form instead of waiting on a blank panel. Nothing here is saved yet.
export function PlanBuildProgress({ exercises, className }: PlanBuildProgressProps) {
  return (
    <ol aria-label="Your plan as it is built" aria-live="polite" className={cn('border-y', className)}>
      {exercises.map((exercise, index) => {
        const primary = exercise.muscles
          .filter((entry) => entry.role === 'primary')
          .map((entry) => muscleLabel(entry.muscle));
        return (
          <li
            key={exercise.exerciseId}
            style={{ animationDelay: `${(index % MAX_STAGGER_STEPS) * STAGGER_MS}ms` }}
            className="flex animate-block-in items-start justify-between gap-4 border-b px-5 py-3 last:border-b-0 sm:px-6"
          >
            <div className="min-w-0">
              <p className="text-base leading-6 font-semibold">{exercise.name}</p>
              <p className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                {primary.join(', ')}
              </p>
            </div>
            <p className="numerals shrink-0 text-right text-2xl leading-none font-bold">
              {exercise.sets}
              <span className="px-0.5 text-muted-foreground">&times;</span>
              {exercise.reps}
              {exercise.load ? (
                <span className="mt-1 block text-sm font-semibold text-muted-foreground">
                  {formatWeight(exercise.load)}
                </span>
              ) : null}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
