import { type ExerciseMuscle, type MuscleId, muscleLabel } from '@cadence/shared/schemas/muscles';
import { FocusStepper } from '@/app/(member)/plan/focus-stepper';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface PanelExercise {
  id: string;
  exerciseName: string;
  sets: number;
  isPerformable: boolean;
  muscles: readonly ExerciseMuscle[];
}

interface MuscleDetailProps {
  muscle: MuscleId;
  exercises: readonly PanelExercise[];
  bias?: number;
  onBias?: (bias: number) => void;
  isBiasDisabled?: boolean;
}

// What one muscle does in a plan: the exercises that hit it, and, when editable, the member's focus for it.
export function MuscleDetail({ muscle, exercises, bias, onBias, isBiasDisabled }: MuscleDetailProps) {
  const hits = exercises.flatMap((exercise) => {
    const entry = exercise.muscles.find((candidate) => candidate.muscle === muscle);
    return entry ? [{ exercise, role: entry.role }] : [];
  });

  return (
    <section aria-label={muscleLabel(muscle)} className="flex flex-col gap-3 border-y py-4">
      <h3 className="font-display text-xl font-bold tracking-wide uppercase">{muscleLabel(muscle)}</h3>
      {hits.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing in this plan trains it.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {hits.map(({ exercise, role }) => (
            <li key={exercise.id} className="flex items-center justify-between gap-3 text-sm">
              <span className={cn('font-semibold', !exercise.isPerformable && 'text-muted-foreground line-through')}>
                {exercise.exerciseName}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Badge variant={role === 'primary' ? 'default' : 'outline'}>{role}</Badge>
                <span className="numerals text-lg leading-none font-bold">{exercise.sets}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {onBias && (
        <div className="flex flex-col gap-2 pt-1">
          <p className="text-sm font-semibold">Focus for this muscle</p>
          <FocusStepper muscle={muscle} value={bias ?? 0} onChange={onBias} disabled={isBiasDisabled} />
          <p className="text-xs text-muted-foreground">Used the next time your coach builds a plan.</p>
        </div>
      )}
    </section>
  );
}
