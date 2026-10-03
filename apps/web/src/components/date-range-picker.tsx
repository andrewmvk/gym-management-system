'use client';

import { CalendarRangeIcon } from 'lucide-react';
import { useState } from 'react';
import { Calendar } from '@/components/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { addDays, fromIsoDate, toIsoDate } from '@/lib/calendar-date';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: string;
  to: string;
}

export interface DateRangePreset {
  label: string;
  // Every preset ends today, so it only has to say where it starts.
  start: (today: Date) => Date;
}

function monthsAgo(count: number) {
  return (today: Date) => addDays(new Date(today.getFullYear(), today.getMonth() - count, today.getDate()), 1);
}

export const DEFAULT_RANGE_PRESETS: readonly DateRangePreset[] = [
  { label: 'Today', start: (today) => today },
  { label: 'Last 7 days', start: (today) => addDays(today, -6) },
  { label: 'Last 30 days', start: (today) => addDays(today, -29) },
  { label: 'This month', start: (today) => new Date(today.getFullYear(), today.getMonth(), 1) },
  { label: 'Last 3 months', start: monthsAgo(3) },
  { label: 'Last 6 months', start: monthsAgo(6) },
  { label: 'This year', start: (today) => new Date(today.getFullYear(), 0, 1) },
  { label: 'Last 12 months', start: monthsAgo(12) },
];

interface DateRangePickerProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
  presets?: readonly DateRangePreset[];
  max?: string;
  className?: string;
  'aria-label'?: string;
}

const formatDay = (date: Date, withYear: boolean) =>
  date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(withYear && { year: 'numeric' }) });

export function DateRangePicker({
  value,
  onChange,
  presets = DEFAULT_RANGE_PRESETS,
  max,
  className,
  ...aria
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  // The first click of a custom range waits here until the second one completes it.
  const [anchor, setAnchor] = useState<Date | null>(null);

  const today = new Date();
  const todayIso = toIsoDate(today);
  const from = fromIsoDate(value.from);
  const to = fromIsoDate(value.to);
  const maxDate = max ? (fromIsoDate(max) ?? undefined) : undefined;

  const activePreset = presets.find((preset) => value.to === todayIso && toIsoDate(preset.start(today)) === value.from);

  function choose(next: DateRange) {
    onChange(next);
    setAnchor(null);
    setOpen(false);
  }

  function selectDay(date: Date) {
    if (!anchor) {
      setAnchor(date);
      return;
    }
    const [start, end] = anchor <= date ? [anchor, date] : [date, anchor];
    choose({ from: toIsoDate(start), to: toIsoDate(end) });
  }

  const summary =
    from && to
      ? `${formatDay(from, from.getFullYear() !== to.getFullYear())} to ${formatDay(to, true)}`
      : 'Pick a range';

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setAnchor(null);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={aria['aria-label']}
          className={cn(
            'flex h-10 w-full items-center gap-2.5 rounded-md border border-input bg-card px-3 text-left text-base transition-[border-color,box-shadow] outline-none hover:border-foreground/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 aria-expanded:border-ring md:text-sm dark:bg-input/10',
            className,
          )}
        >
          <CalendarRangeIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 truncate">
            {activePreset && <span className="font-semibold">{activePreset.label}</span>}
            {activePreset && <span className="text-muted-foreground"> · </span>}
            <span className={cn(activePreset && 'text-muted-foreground')}>{summary}</span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="flex gap-1 overflow-x-auto border-b p-2 sm:w-44 sm:flex-col sm:overflow-visible sm:border-r sm:border-b-0">
            {presets.map((preset) => {
              const isActive = preset === activePreset;
              return (
                <Button
                  key={preset.label}
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className="justify-start whitespace-nowrap"
                  onClick={() => choose({ from: toIsoDate(preset.start(today)), to: todayIso })}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>
          <div className="flex flex-col gap-3 p-3">
            <Calendar
              selected={null}
              rangeFrom={anchor ?? from}
              rangeTo={anchor ? null : to}
              onSelect={selectDay}
              max={maxDate}
            />
            <p className="border-t pt-3 text-sm text-muted-foreground">
              {anchor ? 'Now pick the last day of the range.' : 'Or pick the first and last day on the calendar.'}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
