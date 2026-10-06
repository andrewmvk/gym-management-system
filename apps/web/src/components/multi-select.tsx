'use client';

import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { SearchInput } from '@/components/search-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: readonly MultiSelectOption[];
  value: readonly string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  // A short list is faster to scan than to search, so the search field only appears from this many options.
  searchFrom?: number;
  'aria-label'?: string;
}

// The select for a choice of several: a closed trigger that says how many are picked, a panel that stays open while
// ticking, and the picks as removable chips underneath so what is chosen never hides inside the closed panel.
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  searchFrom = 8,
  'aria-label': ariaLabel,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const matches = options.filter((option) => !term || option.label.toLowerCase().includes(term));
  const picked = options.filter((option) => value.includes(option.value));

  const toggle = (optionValue: string) =>
    onChange(value.includes(optionValue) ? value.filter((entry) => entry !== optionValue) : [...value, optionValue]);

  return (
    <div className="flex flex-col gap-2">
      {/* Modal, so that inside the sheet it keeps its own focus and scroll instead of losing both to the sheet's. */}
      <Popover
        modal
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) setQuery('');
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className="group flex h-10 w-full items-center justify-between gap-1.5 rounded-md border border-input bg-card py-2 pr-2.5 pl-3 text-base transition-[border-color,box-shadow] outline-none hover:border-foreground/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 data-[state=open]:border-ring data-[state=open]:ring-3 data-[state=open]:ring-ring/25 md:text-sm dark:bg-input/10"
          >
            <span className={cn('truncate', picked.length === 0 && 'text-muted-foreground')}>
              {picked.length === 0 ? placeholder : `${picked.length} selected`}
            </span>
            <ChevronDownIcon
              className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[state=open]:rotate-180"
              aria-hidden
            />
          </button>
        </PopoverTrigger>
        <PopoverContent className="flex w-(--radix-popover-trigger-width) flex-col gap-2 p-1">
          {options.length > searchFrom && (
            <SearchInput value={query} onChange={setQuery} placeholder={searchPlaceholder} className="p-1" />
          )}
          <ul aria-label={ariaLabel} className="max-h-64 overflow-y-auto">
            {matches.length === 0 && <li className="px-3 py-3 text-sm text-muted-foreground">{emptyMessage}</li>}
            {matches.map((option) => {
              const isPicked = value.includes(option.value);
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    aria-pressed={isPicked}
                    onClick={() => toggle(option.value)}
                    className={cn(
                      'flex min-h-11 w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted focus-visible:ring-3 focus-visible:ring-ring/45 focus-visible:ring-inset',
                      isPicked && 'bg-accent/50 font-semibold',
                    )}
                  >
                    <span className="min-w-0 break-words">{option.label}</span>
                    {isPicked && <CheckIcon className="size-4 shrink-0 text-primary" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
        </PopoverContent>
      </Popover>
      {picked.length > 0 && (
        <ul aria-label="Selected" className="flex flex-wrap gap-1.5">
          {picked.map((option) => (
            <li
              key={option.value}
              className="flex items-center gap-1 rounded-sm border border-primary/40 bg-accent/50 py-0.5 pr-0.5 pl-2 text-sm"
            >
              <span className="break-words">{option.label}</span>
              <button
                type="button"
                aria-label={`Remove ${option.label}`}
                onClick={() => toggle(option.value)}
                className="flex size-6 items-center justify-center rounded-xs text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/45"
              >
                <XIcon className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
