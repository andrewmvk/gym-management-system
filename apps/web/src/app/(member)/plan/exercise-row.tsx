'use client';

import { CheckIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ExerciseRowProps {
  index: number;
  name: string;
  muscleGroup: string;
  instructions: string;
  sets: number;
  reps: number;
  load: string | null;
  notes: string | null;
  completed: boolean;
  isPerformable: boolean;
  onToggle?: (completed: boolean) => void;
  disabled?: boolean;
}

// onToggle is only passed for today's plan; history rows omit it and render read-only.
function ExerciseRowRoot({
  index,
  name,
  muscleGroup,
  instructions,
  sets,
  reps,
  load,
  notes,
  completed,
  isPerformable,
  onToggle,
  disabled,
}: ExerciseRowProps) {
  return (
    <div
      data-done={completed}
      className="flex items-start gap-3 border-b px-5 py-4 transition-colors duration-300 last:border-b-0 data-[done=true]:bg-muted/50 sm:gap-4 sm:px-6"
    >
      {onToggle ? (
        <Checkbox
          checked={completed}
          disabled={!isPerformable || disabled}
          onCheckedChange={(checked) => onToggle(checked === true)}
          className="mt-0.5 size-6 [&_svg]:size-4.5!"
          aria-label={`Mark ${name} as completed`}
        />
      ) : (
        <span
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
            <p
              className={cn(
                'strike-wipe w-fit text-base leading-6 font-semibold transition-colors duration-300',
                completed && 'text-muted-foreground',
              )}
            >
              {name}
            </p>
            <p className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {muscleGroup}
            </p>
          </div>
          <p
            className={cn(
              'numerals shrink-0 text-right text-3xl leading-none font-bold transition-opacity duration-300',
              completed && 'opacity-45',
              !isPerformable && 'text-muted-foreground line-through decoration-2',
            )}
          >
            {sets}
            <span className="px-0.5 text-muted-foreground">&times;</span>
            {reps}
            {load && <span className="mt-1 block text-sm font-semibold text-muted-foreground">{load}</span>}
          </p>
        </div>
        {!isPerformable && (
          <Badge variant="outline" className="text-muted-foreground">
            Equipment unavailable right now
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
