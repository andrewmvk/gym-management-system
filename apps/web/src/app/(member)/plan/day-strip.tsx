'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { currentWeek, type WeekDay } from '@/app/(member)/home/current-week';
import { relationOf, shiftIsoDate } from '@/app/(member)/plan/plan-day';
import { DatePicker } from '@/components/date-picker';
import { Deferred } from '@/components/deferred';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fromIsoDate } from '@/lib/calendar-date';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

const MAX_SEGMENTS = 8;

interface DaySummary {
  status: 'ai_published' | 'trainer_edited';
  exerciseCount: number;
  completedCount: number;
}

function weekRelativeName(week: readonly WeekDay[], todayIso: string) {
  const thisMonday = currentWeek(fromIsoDate(todayIso) ?? new Date())[0]!.date;
  const weeks = Math.round((week[0]!.date.getTime() - thisMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  if (weeks === 0) return 'This week';
  if (weeks === -1) return 'Last week';
  if (weeks === 1) return 'Next week';
  return null;
}

function weekRange(week: readonly WeekDay[], todayIso: string) {
  const first = week[0]!.date;
  const last = week[6]!.date;
  const isThisYear = first.getFullYear() === (fromIsoDate(todayIso) ?? new Date()).getFullYear();
  const year = isThisYear ? {} : { year: 'numeric' as const };
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} to ${last.toLocaleDateString(undefined, { day: 'numeric', month: 'long', ...year })}`;
  }
  return `${first.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} to ${last.toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...year })}`;
}

// One slanted segment per exercise: filled when done, dashed while the day has not come. A long plan is drawn
// with a fixed number of segments so every tile keeps its width.
function Segments({ summary, isFuture }: { summary: DaySummary; isFuture: boolean }) {
  const shown = Math.min(summary.exerciseCount, MAX_SEGMENTS);
  const filled = Math.floor((summary.completedCount / summary.exerciseCount) * shown);
  return (
    <span
      aria-hidden
      className="grid w-full gap-0.5"
      style={{ gridTemplateColumns: `repeat(${shown}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: shown }, (_, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: one fixed segment per exercise slot, never reordered.
          key={index}
          className={cn(
            'h-1.5 -skew-x-12 rounded-xs transition-colors duration-500',
            isFuture ? 'border border-dashed border-foreground/35' : index < filled ? 'bg-primary' : 'bg-foreground/15',
          )}
        />
      ))}
    </span>
  );
}

function describeTile(day: WeekDay, isToday: boolean, summary: DaySummary | undefined, isFuture: boolean) {
  const date = day.date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const parts = [date];
  if (isToday) parts.push('today');
  if (!summary) parts.push('no plan');
  else if (isFuture) parts.push(`${summary.exerciseCount} planned`);
  else parts.push(`${summary.completedCount} of ${summary.exerciseCount} done`);
  if (summary?.status === 'trainer_edited') parts.push('edited by a trainer');
  return parts.join(', ');
}

interface DayTileProps {
  day: WeekDay;
  todayIso: string;
  isSelected: boolean;
  isLoading: boolean;
  summary: DaySummary | undefined;
  onSelect: () => void;
}

// A quiet tile: no border until it is the chosen one, the weekday and date in ink, and under them only what
// the day holds. Done shows as a check, a day in progress as its count, a day ahead as dashed segments.
function DayTile({ day, todayIso, isSelected, isLoading, summary, onSelect }: DayTileProps) {
  const relation = relationOf(day.iso, todayIso);
  const isToday = relation === 'today';
  const isFuture = relation === 'future';
  const hasExercises = Boolean(summary) && summary!.exerciseCount > 0;
  const isComplete = hasExercises && summary!.completedCount === summary!.exerciseCount;

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      aria-current={isToday ? 'date' : undefined}
      aria-label={describeTile(day, isToday, summary, isFuture)}
      onClick={onSelect}
      className={cn(
        'relative flex min-w-0 flex-col items-center gap-1 rounded-md border px-1 py-2 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/45 sm:px-2 sm:py-2.5',
        isSelected ? 'border-primary bg-accent text-accent-foreground' : 'border-transparent hover:bg-muted',
      )}
    >
      {summary?.status === 'trainer_edited' && (
        <span aria-hidden className="absolute top-1.5 right-1.5 h-1 w-2 -skew-x-12 rounded-xs bg-tape" />
      )}
      <span
        aria-hidden
        className={cn(
          'font-display text-xs font-semibold tracking-widest uppercase',
          isSelected ? 'text-accent-foreground' : 'text-muted-foreground',
        )}
      >
        {day.date.toLocaleDateString(undefined, { weekday: 'short' })}
      </span>
      <span
        aria-hidden
        className={cn(
          'numerals text-xl leading-none font-semibold sm:text-2xl',
          isToday && 'underline decoration-primary decoration-2 underline-offset-4',
        )}
      >
        {day.date.getDate()}
      </span>
      <span aria-hidden className="mt-1 flex h-6 w-full flex-col items-center gap-1">
        {isLoading ? (
          <Deferred>
            <Skeleton className="h-1.5 w-full" />
          </Deferred>
        ) : summary && hasExercises ? (
          <>
            <Segments summary={summary} isFuture={isFuture} />
            {isComplete ? (
              <CheckIcon className="size-3.5 stroke-3 text-primary" />
            ) : (
              !isFuture && (
                <span className="numerals text-xs leading-none text-muted-foreground">
                  {summary.completedCount}/{summary.exerciseCount}
                </span>
              )
            )}
          </>
        ) : null}
      </span>
    </button>
  );
}

interface DayStripProps {
  selected: string;
  todayIso: string;
  onSelect: (iso: string) => void;
}

// h-7 is the line box of the text-xl title; the tiles are as tall as a loaded one.
function DayStripSkeleton() {
  return (
    <section
      aria-label="Choose a day"
      className="flex flex-col gap-4 rounded-lg border bg-card px-5 py-4 sm:px-6 sm:py-5"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <Skeleton className="mr-auto h-7 w-40" />
        <div className="flex items-center gap-1.5">
          <Skeleton className="size-10" />
          <Skeleton className="size-10" />
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 flex-1 sm:w-48 sm:flex-none" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {Array.from({ length: 7 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
          <Skeleton key={index} className="h-20 w-full sm:h-24" />
        ))}
      </div>
    </section>
  );
}

// A week of the member's plan at a glance, Monday to Sunday: each day says whether there is a plan and how much
// of it is done. The arrows move the selection a week at a time, so what is shown below always sits in view.
function DayStripRoot({ selected, todayIso, onSelect }: DayStripProps) {
  const trpc = useTRPC();
  const week = currentWeek(fromIsoDate(selected) ?? new Date());
  const daysQuery = useQuery(trpc.plans.listDays.queryOptions({ from: week[0]!.iso, to: week[6]!.iso }));
  const summaries = new Map(daysQuery.data?.map((day) => [day.planDate, day]));
  const relativeName = weekRelativeName(week, todayIso);

  return (
    <section
      aria-label="Choose a day"
      className="flex flex-col gap-4 rounded-lg border bg-card px-5 py-4 sm:px-6 sm:py-5"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <div className="mr-auto min-w-0 space-y-1">
          <h2 className="font-display text-xl font-bold tracking-wide uppercase leading-none">
            {weekRange(week, todayIso)}
          </h2>
          {relativeName && <p className="text-sm text-muted-foreground leading-none">{relativeName}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous week"
            onClick={() => onSelect(shiftIsoDate(selected, -7))}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next week"
            onClick={() => onSelect(shiftIsoDate(selected, 7))}
          >
            <ChevronRightIcon />
          </Button>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button variant="outline" disabled={selected === todayIso} onClick={() => onSelect(todayIso)}>
            Today
          </Button>
          <DatePicker
            aria-label="Jump to a date"
            placeholder="Jump to a date"
            value={selected}
            onChange={(value) => value && onSelect(value)}
            className="flex-1 sm:w-48 sm:flex-none"
          />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {week.map((day) => (
          <DayTile
            key={day.iso}
            day={day}
            todayIso={todayIso}
            isSelected={day.iso === selected}
            isLoading={daysQuery.isPending}
            summary={summaries.get(day.iso)}
            onSelect={() => onSelect(day.iso)}
          />
        ))}
      </div>
      {daysQuery.isError && (
        <p role="alert" className="text-sm text-muted-foreground">
          We couldn&apos;t load how much of each day is done.{' '}
          <button
            type="button"
            className="font-semibold text-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
            onClick={() => daysQuery.refetch()}
          >
            Try again
          </button>
        </p>
      )}
    </section>
  );
}

export const DayStrip = Object.assign(DayStripRoot, { Skeleton: DayStripSkeleton });
