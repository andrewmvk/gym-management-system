'use client';

import {
  type ExerciseMuscle,
  MUSCLE_GROUPS,
  type MuscleId,
  type MuscleRole,
  muscleLabel,
} from '@cadence/shared/schemas/muscles';
import { ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';
import { SearchInput } from '@/components/search-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

const ROLES: readonly { role: MuscleRole; label: string }[] = [
  { role: 'primary', label: 'Primary' },
  { role: 'secondary', label: 'Supporting' },
];

interface MuscleNamePickerProps {
  value: readonly ExerciseMuscle[];
  onChange: (value: ExerciseMuscle[]) => void;
  onHover?: (muscle: MuscleId | null) => void;
}

// The keyboard and screen-reader path to the body, and the quick path when the name is known: the 22 muscles live
// in a panel of their own, grouped by region and searchable, so the form never grows by a list that long. Each
// muscle asks for its role in a toggle group, a second press on the chosen segment clears it.
export function MuscleNamePicker({ value, onChange, onHover }: MuscleNamePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const groups = MUSCLE_GROUPS.map((group) => ({
    ...group,
    muscles: group.muscles.filter((muscle) => !term || muscleLabel(muscle).toLowerCase().includes(term)),
  })).filter((group) => group.muscles.length > 0);

  const roleOf = (muscle: MuscleId) => value.find((entry) => entry.muscle === muscle)?.role;

  // The group reports an empty value when the chosen segment is pressed again, which clears the muscle.
  function setRole(muscle: MuscleId, next: string) {
    const role = ROLES.find((entry) => entry.role === next)?.role;
    const rest = value.filter((entry) => entry.muscle !== muscle);
    onChange(role ? [...rest, { muscle, role }] : rest);
  }

  return (
    // Modal, so that inside the sheet it keeps its own focus and scroll instead of losing both to the sheet's.
    <Popover
      modal
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setQuery('');
          onHover?.(null);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group flex h-10 w-full items-center justify-between gap-1.5 rounded-md border border-input bg-card py-2 pr-2.5 pl-3 text-base transition-[border-color,box-shadow] outline-none hover:border-foreground/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 data-[state=open]:border-ring data-[state=open]:ring-3 data-[state=open]:ring-ring/25 md:text-sm dark:bg-input/10"
        >
          <span className="text-muted-foreground">Choose by name</span>
          <ChevronDownIcon
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-180"
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex w-(--radix-popover-trigger-width) min-w-72 flex-col gap-1 p-1">
        <SearchInput value={query} onChange={setQuery} placeholder="Search muscles" className="p-1" />
        <div className="max-h-72 overflow-y-auto">
          {groups.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">No muscle matches.</p>}
          {groups.map((group) => (
            <section key={group.id} aria-labelledby={`muscle-group-${group.id}`}>
              <h3
                id={`muscle-group-${group.id}`}
                className="px-3 pt-3 pb-1 font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase"
              >
                {group.label}
              </h3>
              <ul>
                {group.muscles.map((muscle) => {
                  const current = roleOf(muscle);
                  return (
                    <li
                      key={muscle}
                      onPointerEnter={() => onHover?.(muscle)}
                      onPointerLeave={() => onHover?.(null)}
                      className={cn(
                        'flex min-h-11 items-center justify-between gap-2 rounded-sm px-3 py-1.5',
                        current && 'bg-accent/50',
                      )}
                    >
                      <span className={cn('min-w-0 text-sm', current ? 'font-semibold' : 'font-medium')}>
                        {muscleLabel(muscle)}
                      </span>
                      <ToggleGroup
                        type="single"
                        aria-label={`${muscleLabel(muscle)} role`}
                        value={current ?? ''}
                        onValueChange={(next) => setRole(muscle, next)}
                        className="shrink-0"
                      >
                        {ROLES.map(({ role, label }) => (
                          <ToggleGroupItem
                            key={role}
                            value={role}
                            onFocus={() => onHover?.(muscle)}
                            onBlur={() => onHover?.(null)}
                          >
                            {label}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
