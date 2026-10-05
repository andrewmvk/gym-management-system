'use client';

import { type ExerciseMuscle, muscleLabel } from '@cadence/shared/schemas/muscles';
import { AtSignIcon, CheckIcon } from 'lucide-react';
import { PrescriptionFields, type PrescriptionNumbers } from '@/components/prescription-fields';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ExerciseRowProps {
  index: number;
  name: string;
  muscles: readonly ExerciseMuscle[];
  isDimmed?: boolean;
  instructions: string;
  sets: number;
  reps: number;
  load: number | null;
  notes: string | null;
  completed: boolean;
  isPerformable: boolean;
  equipmentDown?: readonly string[];
  onToggle?: (completed: boolean) => void;
  disabled?: boolean;
  // A day that has not come yet shows the same box as today's plan, switched off.
  isTickLocked?: boolean;
  // The coach's pointing mode: the whole row becomes one target that adds this exercise to the message.
  pointing?: { isActive: boolean; isMarked: boolean; onPoint: () => void };
  // The member's own correction of sets, reps or weight, made in place. It resolves when saved and rejects when
  // it failed, so the fields fall back to what is stored.
  onEditNumbers?: (numbers: PrescriptionNumbers) => Promise<unknown>;
  isEditPending?: boolean;
}

// onToggle is only passed for today's plan; history rows omit it and render read-only.
function ExerciseRowRoot({
  index,
  name,
  muscles,
  isDimmed,
  instructions,
  sets,
  reps,
  load,
  notes,
  completed,
  isPerformable,
  equipmentDown,
  onToggle,
  disabled,
  isTickLocked,
  pointing,
  onEditNumbers,
  isEditPending,
}: ExerciseRowProps) {
  const primaryLabels = muscles.filter((entry) => entry.role === 'primary').map((entry) => muscleLabel(entry.muscle));
  const secondaryLabels = muscles
    .filter((entry) => entry.role === 'secondary')
    .map((entry) => muscleLabel(entry.muscle));
  const isEditable = Boolean(onEditNumbers) && !completed && isPerformable;

  return (
    <div
      data-done={completed}
      className={cn(
        'relative flex items-start gap-3 border-b px-5 py-4 transition-[color,background-color,opacity] duration-300 last:border-b-0 data-[done=true]:bg-muted/50 sm:gap-4 sm:px-6',
        isDimmed && 'opacity-45',
        pointing?.isActive && 'outline-2 -outline-offset-2 outline-primary/60 outline-dashed',
        pointing?.isMarked && 'bg-accent/50 outline-solid outline-primary',
      )}
    >
      {pointing?.isActive && (
        <button
          type="button"
          onClick={pointing.onPoint}
          aria-pressed={pointing.isMarked}
          className="absolute inset-0 z-10 outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
        >
          <span className="sr-only">Point the coach at {name}</span>
        </button>
      )}
      {pointing?.isMarked && (
        <span className="absolute top-2 right-3 z-10 flex h-6 items-center gap-1 rounded-sm bg-primary px-2 font-display text-xs font-semibold tracking-widest text-primary-foreground uppercase">
          <AtSignIcon className="size-3" aria-hidden />
          Pointed at
        </span>
      )}
      {onToggle || isTickLocked ? (
        <Checkbox
          checked={completed}
          disabled={isTickLocked || !isPerformable || disabled}
          onCheckedChange={(checked) => onToggle?.(checked === true)}
          className="mt-0.5 size-6 after:-inset-2.5 [&_svg]:size-4.5!"
          aria-label={isTickLocked ? `${name}, can be ticked on the day` : `Mark ${name} as completed`}
        />
      ) : (
        <span
          role="img"
          aria-label={completed ? 'Completed' : 'Not completed'}
          className={cn(
            'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-sm border-2',
            completed ? 'border-primary bg-primary text-primary-foreground' : 'border-dashed border-input',
          )}
        >
          {completed && <CheckIcon className="size-4 stroke-3" />}
        </span>
      )}
      <span className="numerals mt-px hidden w-6 shrink-0 text-xl leading-6 font-bold text-muted-foreground sm:block">
        {index + 1}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span
              className={cn(
                'strike-wipe block w-fit text-base leading-6 font-semibold transition-colors duration-300',
                completed && 'text-muted-foreground',
              )}
            >
              {name}
            </span>
            <span className="block font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {primaryLabels.join(', ')}
              {secondaryLabels.length > 0 && (
                <span className="font-sans tracking-normal normal-case"> + {secondaryLabels.join(', ')}</span>
              )}
            </span>
          </div>
          <PrescriptionFields
            name={name}
            size="lg"
            sets={sets}
            reps={reps}
            load={load}
            isEditable={isEditable}
            isPending={isEditPending}
            isStruck={!isPerformable}
            onCommit={onEditNumbers}
            className={cn('duration-300', completed && 'opacity-45')}
          />
        </div>
        {!isPerformable && (
          <Badge variant="outline" className="text-muted-foreground">
            {equipmentDown?.length
              ? `${equipmentDown.join(', ')} ${equipmentDown.length === 1 ? 'is' : 'are'} out of service`
              : 'Out of service'}
          </Badge>
        )}
        <p className="max-w-prose text-sm text-pretty text-muted-foreground">{instructions}</p>
        {notes && (
          <p className="max-w-prose rounded-sm bg-accent/60 px-3 py-2 text-sm text-pretty">
            <span className="font-semibold">Note: </span>
            {notes}
          </p>
        )}
      </div>
    </div>
  );
}

function ExerciseRowSkeleton() {
  return (
    <div className="flex items-start gap-3 border-b px-5 py-4 last:border-b-0 sm:gap-4 sm:px-6">
      <Skeleton className="mt-0.5 size-6 shrink-0 rounded-sm" />
      <Skeleton className="mt-px hidden h-6 w-6 shrink-0 sm:block" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-16" />
          </div>
          <Skeleton className="h-7 w-14" />
        </div>
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>
    </div>
  );
}

export const ExerciseRow = Object.assign(ExerciseRowRoot, { Skeleton: ExerciseRowSkeleton });
