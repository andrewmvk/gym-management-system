'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

interface ExerciseRowProps {
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
    <div className="flex items-start gap-3 border-b py-3 last:border-b-0">
      {onToggle ? (
        <Checkbox
          checked={completed}
          disabled={!isPerformable || disabled}
          onCheckedChange={(checked) => onToggle(checked === true)}
          className="mt-1"
          aria-label={`Mark ${name} as completed`}
        />
      ) : (
        <div
          className={`mt-1 size-4 shrink-0 rounded-sm border ${completed ? 'border-primary bg-primary' : 'border-input'}`}
          aria-hidden
        />
      )}
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">{name}</p>
          <span className="text-sm text-muted-foreground">{muscleGroup}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {sets} sets &times; {reps} reps{load ? ` @ ${load}` : ''}
        </p>
        {!isPerformable && <p className="text-sm text-destructive">Equipment unavailable right now.</p>}
        <p className="text-sm text-muted-foreground">{instructions}</p>
        {notes && <p className="text-sm text-muted-foreground italic">{notes}</p>}
      </div>
    </div>
  );
}

function ExerciseRowSkeleton() {
  return (
    <div className="flex items-start gap-3 border-b py-3 last:border-b-0">
      <Skeleton className="mt-1 size-4 shrink-0 rounded-sm" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>
    </div>
  );
}

export const ExerciseRow = Object.assign(ExerciseRowRoot, { Skeleton: ExerciseRowSkeleton });
