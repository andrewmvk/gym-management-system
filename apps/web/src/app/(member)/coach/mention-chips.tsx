import { muscleLabel } from '@cadence/shared/schemas/muscles';
import { AtSignIcon, XIcon } from 'lucide-react';
import { type MentionChip, mentionKey } from '@/app/(member)/coach/coach-context';
import { cn } from '@/lib/utils';

export function mentionLabel(chip: MentionChip): string {
  return chip.type === 'exercise' ? chip.name : muscleLabel(chip.muscle);
}

interface MentionChipsProps {
  chips: readonly MentionChip[];
  onRemove?: (key: string) => void;
  className?: string;
}

// What the member pointed at. The coach receives the exact exercise or muscle, so "make it 3 reps" cannot be
// mistaken for a similar exercise.
export function MentionChips({ chips, onRemove, className }: MentionChipsProps) {
  if (chips.length === 0) return null;
  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)} aria-label="Pointed at">
      {chips.map((chip) => {
        const key = mentionKey(chip);
        return (
          <li
            key={key}
            className="flex h-7 max-w-full items-center gap-1 rounded-sm bg-accent pr-1 pl-2 text-xs font-semibold text-accent-foreground"
          >
            <AtSignIcon className="size-3 shrink-0" aria-hidden />
            <span className="truncate">
              {mentionLabel(chip)}
              {chip.type === 'muscle' && <span className="font-normal"> muscle</span>}
            </span>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(key)}
                aria-label={`Stop pointing at ${mentionLabel(chip)}`}
                className="flex size-5 shrink-0 items-center justify-center rounded-xs outline-none hover:bg-accent-foreground/15 focus-visible:ring-3 focus-visible:ring-ring/45"
              >
                <XIcon className="size-3" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
