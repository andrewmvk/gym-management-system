import type { CoachBlock, PickerOption } from '@cadence/shared/schemas/coach';
import { muscleLabel } from '@cadence/shared/schemas/muscles';
import { CheckIcon, PlusIcon, TriangleAlertIcon } from 'lucide-react';
import { Prescription } from '@/app/(member)/coach/prescription';
import { Button } from '@/components/ui/button';

type PickerBlock = Extract<CoachBlock, { type: 'exercise_picker' }>;

interface ExercisePickerCardProps {
  block: PickerBlock;
  addedIds: ReadonlySet<string>;
  isDisabled?: boolean;
  onAdd: (option: PickerOption) => void;
}

// A short list the coach chose for a muscle the member pointed at, each with the reason it suits them.
// Adding one puts it into the draft; the plan itself is untouched until the member applies the draft.
export function ExercisePickerCard({ block, addedIds, isDisabled, onAdd }: ExercisePickerCardProps) {
  return (
    <section
      aria-label={`Exercises for ${muscleLabel(block.muscle)}`}
      className="animate-block-in flex flex-col rounded-lg border bg-card text-card-foreground"
    >
      <h3 className="border-b px-3 py-2 font-display text-sm font-semibold tracking-widest text-muted-foreground uppercase">
        For {muscleLabel(block.muscle)}
      </h3>
      <ul>
        {block.options.map((option) => {
          const isAdded = addedIds.has(option.exerciseId);
          return (
            <li key={option.exerciseId} className="flex flex-col gap-1.5 border-b px-3 py-2.5 last:border-b-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-base font-semibold text-pretty">{option.name}</p>
                  <p className="text-sm text-pretty text-muted-foreground">{option.reason}</p>
                </div>
                <Prescription sets={option.sets} reps={option.reps} load={option.load} className="shrink-0 text-xl" />
              </div>
              {option.warning && (
                <p className="flex items-start gap-1.5 rounded-sm bg-tape px-2 py-1.5 text-xs font-semibold text-pretty text-tape-foreground">
                  <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  {option.warning}
                </p>
              )}
              <Button
                type="button"
                size="sm"
                variant={isAdded ? 'ghost' : 'outline'}
                className="w-fit"
                disabled={isAdded || isDisabled}
                onClick={() => onAdd(option)}
              >
                {isAdded ? <CheckIcon data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
                {isAdded ? 'In your draft' : 'Add to my plan'}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
