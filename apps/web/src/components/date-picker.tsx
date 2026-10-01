'use client';

import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { Calendar } from '@/components/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { fromIsoDate, toIsoDate } from '@/lib/calendar-date';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  min?: string;
  max?: string;
  captionLayout?: 'label' | 'dropdown';
  isClearable?: boolean;
  className?: string;
  'aria-invalid'?: boolean;
  'aria-label'?: string;
}

export function DatePicker({
  id,
  value,
  onChange,
  onBlur,
  placeholder = 'Pick a date',
  min,
  max,
  captionLayout,
  isClearable,
  className,
  ...aria
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = fromIsoDate(value);
  const minDate = min ? (fromIsoDate(min) ?? undefined) : undefined;
  const maxDate = max ? (fromIsoDate(max) ?? undefined) : undefined;
  const todayIso = toIsoDate(new Date());
  // A "Today" shortcut is noise on a year-browsing picker such as a birthdate.
  const isTodayAllowed = captionLayout !== 'dropdown' && (!min || todayIso >= min) && (!max || todayIso <= max);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) onBlur?.();
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          aria-invalid={aria['aria-invalid']}
          aria-label={aria['aria-label']}
          className={cn(
            'flex h-10 w-full items-center gap-2.5 rounded-md border border-input bg-card px-3 text-left text-base transition-[border-color,box-shadow] outline-none hover:border-foreground/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 aria-expanded:border-ring aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15 md:text-sm dark:bg-input/10',
            className,
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn('flex-1 truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto">
        <Calendar
          selected={selected}
          onSelect={(date) => choose(toIsoDate(date))}
          min={minDate}
          max={maxDate}
          captionLayout={captionLayout}
        />
        {(isTodayAllowed || isClearable) && (
          <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
            {isTodayAllowed ? (
              <Button variant="ghost" size="sm" onClick={() => choose(todayIso)}>
                Today
              </Button>
            ) : (
              <span />
            )}
            {isClearable && value && (
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => choose('')}>
                Clear
              </Button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
