import type { CoachBlock, PickerOption } from '@cadence/shared/schemas/coach';
import { ArrowLeftRightIcon, TriangleAlertIcon } from 'lucide-react';
import { Prescription } from '@/app/(member)/coach/prescription';
import { Button } from '@/components/ui/button';

type SafetyBlock = Extract<CoachBlock, { type: 'safety_warning' }>;

interface SafetyWarningCardProps {
  block: SafetyBlock;
  isDisabled?: boolean;
  onSwap: (option: PickerOption) => void;
}

// Pace Tape means "look at this": the coach found something in the plan that conflicts with what the member
// reported, and offers safer exercises to put in its place.
export function SafetyWarningCard({ block, isDisabled, onSwap }: SafetyWarningCardProps) {
  return (
    <section
      aria-label={`Safety warning for ${block.exercise.name}`}
      className="animate-block-in flex flex-col gap-2 rounded-lg bg-tape p-3 text-tape-foreground"
    >
      <div className="flex items-start gap-2">
        <TriangleAlertIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="font-display text-lg leading-tight font-bold tracking-wide uppercase">
            {block.exercise.name}
          </h3>
          <p className="text-sm text-pretty">{block.reason}</p>
        </div>
      </div>
      {block.alternatives.length > 0 && (
        <ul className="flex flex-col gap-1.5 rounded-md bg-card/70 p-2 text-card-foreground">
          {block.alternatives.map((option) => (
            <li key={option.exerciseId} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-semibold text-pretty">{option.name}</span>
                <Prescription sets={option.sets} reps={option.reps} className="text-base" />
              </div>
              <Button type="button" size="sm" variant="outline" disabled={isDisabled} onClick={() => onSwap(option)}>
                <ArrowLeftRightIcon data-icon="inline-start" />
                Swap in
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
