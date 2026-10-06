'use client';

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addDays, isSameDay, startOfMonth, toIsoDate } from '@/lib/calendar-date';
import { cn } from '@/lib/utils';

interface CalendarProps {
  selected: Date | null;
  onSelect: (date: Date) => void;
  // Range mode highlighting: both ends are drawn as selected and the days between them are tinted.
  rangeFrom?: Date | null;
  rangeTo?: Date | null;
  min?: Date;
  max?: Date;
  captionLayout?: 'label' | 'dropdown';
  fromYear?: number;
  toYear?: number;
}

const WEEKDAY_REFERENCE_SUNDAY = new Date(2023, 0, 1);

const KEY_STEPS: Record<string, (date: Date) => Date> = {
  ArrowLeft: (date) => addDays(date, -1),
  ArrowRight: (date) => addDays(date, 1),
  ArrowUp: (date) => addDays(date, -7),
  ArrowDown: (date) => addDays(date, 7),
  Home: (date) => addDays(date, -date.getDay()),
  End: (date) => addDays(date, 6 - date.getDay()),
  PageUp: (date) => new Date(date.getFullYear(), date.getMonth() - 1, date.getDate()),
  PageDown: (date) => new Date(date.getFullYear(), date.getMonth() + 1, date.getDate()),
};

function clamp(date: Date, min?: Date, max?: Date) {
  if (min && date < min) return min;
  if (max && date > max) return max;
  return date;
}

export function Calendar({
  selected,
  onSelect,
  rangeFrom = null,
  rangeTo = null,
  min,
  max,
  captionLayout = 'label',
  fromYear,
  toYear,
}: CalendarProps) {
  const initial = selected ?? rangeTo ?? rangeFrom ?? clamp(new Date(), min, max);
  const [month, setMonth] = useState(startOfMonth(initial));
  const [focused, setFocused] = useState(initial);
  const gridRef = useRef<HTMLDivElement>(null);
  const shouldMoveFocus = useRef(false);
  const today = new Date();

  useEffect(() => {
    if (!shouldMoveFocus.current) return;
    shouldMoveFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${toIsoDate(focused)}"]`)?.focus();
  }, [focused]);

  const minIso = min ? toIsoDate(min) : null;
  const maxIso = max ? toIsoDate(max) : null;
  const isDisabled = (date: Date) => {
    const iso = toIsoDate(date);
    return (minIso !== null && iso < minIso) || (maxIso !== null && iso > maxIso);
  };

  const gridStart = addDays(month, -month.getDay());
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  const weekdays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(WEEKDAY_REFERENCE_SUNDAY, index);
    return { key: toIsoDate(date), label: date.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 2) };
  });

  const showMonth = (next: Date) => {
    setMonth(startOfMonth(next));
    setFocused(clamp(new Date(next.getFullYear(), next.getMonth(), Math.min(focused.getDate(), 28)), min, max));
  };

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = KEY_STEPS[event.key];
    if (!step) return;
    event.preventDefault();
    const next = clamp(step(focused), min, max);
    shouldMoveFocus.current = true;
    setFocused(next);
    if (next.getMonth() !== month.getMonth() || next.getFullYear() !== month.getFullYear())
      setMonth(startOfMonth(next));
  }

  const firstYear = fromYear ?? min?.getFullYear() ?? today.getFullYear() - 100;
  const lastYear = toYear ?? max?.getFullYear() ?? today.getFullYear() + 5;
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => lastYear - index);
  const previousMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const canGoBack = !min || addDays(month, -1) >= startOfMonth(min);
  const canGoForward = !max || nextMonth <= max;

  return (
    <div className="flex w-72 flex-col gap-3">
      <div className="flex items-center justify-between gap-1">
        <Button variant="ghost" size="icon-sm" disabled={!canGoBack} onClick={() => showMonth(previousMonth)}>
          <ChevronLeftIcon />
          <span className="sr-only">Previous month</span>
        </Button>
        {captionLayout === 'dropdown' ? (
          <div className="flex flex-1 gap-1.5">
            <Select
              value={String(month.getMonth())}
              onValueChange={(value) => showMonth(new Date(month.getFullYear(), Number(value), 1))}
            >
              <SelectTrigger size="sm" className="flex-1" aria-label="Month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: the index is the month number, a fixed 12-item list.
                  <SelectItem key={index} value={String(index)}>
                    {new Date(2023, index, 1).toLocaleDateString(undefined, { month: 'short' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(month.getFullYear())}
              onValueChange={(value) => showMonth(new Date(Number(value), month.getMonth(), 1))}
            >
              <SelectTrigger size="sm" className="w-24" aria-label="Year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="font-display text-lg font-bold tracking-wider uppercase" aria-live="polite">
            <span key={toIsoDate(month)} className="inline-block animate-tick">
              {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
          </p>
        )}
        <Button variant="ghost" size="icon-sm" disabled={!canGoForward} onClick={() => showMonth(nextMonth)}>
          <ChevronRightIcon />
          <span className="sr-only">Next month</span>
        </Button>
      </div>

      <div role="grid" ref={gridRef} onKeyDown={handleKeyDown} className="grid grid-cols-7 gap-0.5">
        {weekdays.map(({ key, label }) => (
          <span
            key={key}
            role="columnheader"
            className="flex h-8 items-center justify-center font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase"
          >
            {label}
          </span>
        ))}
        {days.map((date) => {
          const isOutside = date.getMonth() !== month.getMonth();
          const iso = toIsoDate(date);
          const isRangeEnd =
            (rangeFrom !== null && isSameDay(date, rangeFrom)) || (rangeTo !== null && isSameDay(date, rangeTo));
          const isSelected = (selected !== null && isSameDay(date, selected)) || isRangeEnd;
          const isInRange =
            rangeFrom !== null && rangeTo !== null && iso > toIsoDate(rangeFrom) && iso < toIsoDate(rangeTo);
          const isToday = isSameDay(date, today);
          return (
            <button
              key={toIsoDate(date)}
              type="button"
              role="gridcell"
              data-date={toIsoDate(date)}
              aria-selected={isSelected}
              aria-current={isToday ? 'date' : undefined}
              aria-label={date.toLocaleDateString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              tabIndex={isSameDay(date, focused) ? 0 : -1}
              disabled={isDisabled(date)}
              onClick={() => onSelect(date)}
              className={cn(
                'numerals relative flex size-10 items-center justify-center rounded-sm text-base font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/45 disabled:pointer-events-none disabled:opacity-30',
                isSelected ? 'bg-primary text-primary-foreground' : isInRange ? 'bg-primary/10' : 'hover:bg-muted',
                isOutside && !isSelected && 'text-muted-foreground/60',
                isToday &&
                  !isSelected &&
                  'text-primary after:absolute after:bottom-1.5 after:h-0.5 after:w-3 after:rounded-full after:bg-current',
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
