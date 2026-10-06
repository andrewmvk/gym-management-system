'use client';

import { ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';
import { SearchInput } from '@/components/search-input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface PickableExercise {
  id: string;
  name: string;
  isAvailable: boolean;
}

interface ExercisePickerProps {
  exercises: readonly PickableExercise[];
  onPick: (exerciseId: string) => void;
}

// The catalog has far more exercises than a plain select can scan, so the list filters as the trainer types.
export function ExercisePicker({ exercises, onPick }: ExercisePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const matches = exercises.filter((exercise) => !term || exercise.name.toLowerCase().includes(term));

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Add an exercise from the catalog"
          className="flex h-10 w-full items-center justify-between gap-1.5 rounded-md border border-input bg-card py-2 pr-2.5 pl-3 text-base text-muted-foreground transition-colors outline-none hover:border-foreground/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/10"
        >
          Add an exercise from the catalog
          <ChevronDownIcon className="size-4" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex w-(--radix-popover-trigger-width) flex-col gap-2 p-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search exercises" />
        <ul aria-label="Exercises" className="max-h-64 overflow-y-auto">
          {matches.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">No exercise matches.</li>}
          {matches.map((exercise) => (
            <li key={exercise.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(exercise.id);
                  setIsOpen(false);
                  setQuery('');
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/45 focus-visible:ring-inset',
                  !exercise.isAvailable && 'text-muted-foreground',
                )}
              >
                <span className="min-w-0 truncate">{exercise.name}</span>
                {!exercise.isAvailable && <Badge variant="unavailable">Out of service</Badge>}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
