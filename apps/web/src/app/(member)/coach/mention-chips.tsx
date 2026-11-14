'use client';

import { AtSignIcon, XIcon } from 'lucide-react';
import { type MentionChip, mentionKey } from '@/app/(member)/coach/coach-context';
import { type I18n, useI18n } from '@/lib/i18n/i18n-provider';
import { cn } from '@/lib/utils';

export function mentionLabel({ t, tx, muscleLabel, groupLabel }: I18n, chip: MentionChip): string {
  switch (chip.type) {
    case 'exercise':
      return tx(chip.name);
    case 'muscle':
      return muscleLabel(chip.muscle);
    case 'group':
      return groupLabel(chip.group);
    case 'distribution':
      return t('Muscle distribution');
  }
}

// The word that tells a muscle from a group from an exercise of the same name ("Back" the group, "Lats" the muscle).
export function mentionKind({ t }: Pick<I18n, 't'>, chip: MentionChip): string | null {
  switch (chip.type) {
    case 'muscle':
      return t('mention::muscle');
    case 'group':
      return t('mention::group');
    default:
      return null;
  }
}

interface MentionChipsProps {
  chips: readonly MentionChip[];
  onRemove?: (key: string) => void;
  className?: string;
}

// What the member pointed at. The coach receives the exact exercise, muscle, group or distribution, so "make it
// 3 reps" cannot be mistaken for a similar exercise.
export function MentionChips({ chips, onRemove, className }: MentionChipsProps) {
  const i18n = useI18n();
  const { t } = i18n;
  if (chips.length === 0) return null;
  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)} aria-label={t('Pointed at')}>
      {chips.map((chip) => {
        const key = mentionKey(chip);
        const kind = mentionKind(i18n, chip);
        return (
          <li
            key={key}
            className="flex h-7 max-w-full items-center gap-1 rounded-sm bg-accent pr-1 pl-2 text-xs font-semibold text-accent-foreground"
          >
            <AtSignIcon className="size-3 shrink-0" aria-hidden />
            <span className="truncate">
              {mentionLabel(i18n, chip)}
              {kind && <span className="font-normal"> {kind}</span>}
            </span>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(key)}
                aria-label={t('Stop pointing at {name}', { name: mentionLabel(i18n, chip) })}
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
