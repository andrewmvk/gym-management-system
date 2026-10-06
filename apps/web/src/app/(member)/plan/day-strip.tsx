'use client';

import { useQuery } from '@tanstack/react-query';
import { ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';
import { currentWeek, monthWeeks, type WeekDay } from '@/app/(member)/home/current-week';
import { relationOf } from '@/app/(member)/plan/plan-day';
import { Deferred } from '@/components/deferred';
import { Button } from '@/components/ui/button';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { fromIsoDate } from '@/lib/calendar-date';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

const MAX_SEGMENTS = 8;
const SEGMENT_GAP_DEGREES = 8;
const TRACK = 'color-mix(in oklch, var(--foreground) 20%, transparent)';

const CELL = 'flex flex-col items-center pt-1 pb-2.5';
const CIRCLE = 'size-10 sm:size-12';
const STRIP =
  'group/strip relative flex w-full max-w-xl flex-col items-center gap-2 [--tile-surface:var(--background)] lg:w-lg lg:shrink-0';

interface DaySummary {
  status: 'ai_published' | 'trainer_edited';
  exerciseCount: number;
  completedCount: number;
}

// One arc per exercise, cobalt when done and a quiet track when not. A long plan is drawn with a fixed number of
// arcs so every ring keeps its rhythm, and a ring is only full when the whole plan is done.
function ringBackground(exerciseCount: number, completedCount: number) {
  const shown = Math.min(exerciseCount, MAX_SEGMENTS);
  if (shown === 1) return completedCount > 0 ? 'var(--primary)' : TRACK;
  const filled =
    completedCount >= exerciseCount
      ? shown
      : completedCount === 0
        ? 0
        : Math.min(shown - 1, Math.max(1, Math.floor((completedCount / exerciseCount) * shown)));
  const step = 360 / shown;
  const half = SEGMENT_GAP_DEGREES / 2;
  const stops = [`transparent 0deg ${half}deg`];
  for (let index = 0; index < shown; index++) {
    const start = index * step + half;
    const end = (index + 1) * step - half;
    stops.push(`${index < filled ? 'var(--primary)' : TRACK} ${start}deg ${end}deg`);
    stops.push(`transparent ${end}deg ${Math.min(end + SEGMENT_GAP_DEGREES, 360)}deg`);
  }
  return `conic-gradient(${stops.join(', ')})`;
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
  isDimmed: boolean;
  isLoading: boolean;
  summary: DaySummary | undefined;
  onSelect: () => void;
}

// A circle with the day number in it. The border is the plan: one arc per exercise, filled as they are done.
// A day with no plan has no border, only its number, so every day takes the same room.
function DayTile({ day, todayIso, isSelected, isDimmed, isLoading, summary, onSelect }: DayTileProps) {
  const relation = relationOf(day.iso, todayIso);
  const isToday = relation === 'today';
  const isFuture = relation === 'future';
  const hasExercises = Boolean(summary) && summary!.exerciseCount > 0;

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      aria-current={isToday ? 'date' : undefined}
      aria-label={describeTile(day, isToday, summary, isFuture)}
      onClick={onSelect}
      className={cn(
        'group relative min-w-0 outline-none',
        CELL,
        isDimmed && !isSelected && 'opacity-50 transition-opacity hover:opacity-100 focus-visible:opacity-100',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'relative grid place-items-center rounded-full p-0.75 group-focus-visible:ring-3 group-focus-visible:ring-ring/45',
          CIRCLE,
        )}
        style={
          summary && hasExercises
            ? { background: ringBackground(summary.exerciseCount, isFuture ? 0 : summary.completedCount) }
            : undefined
        }
      >
        {isLoading && (
          <Deferred>
            <Skeleton className="absolute inset-0 rounded-full" />
          </Deferred>
        )}
        <span className="relative grid size-full rounded-full bg-(--tile-surface) p-0.5">
          <span
            className={cn(
              'numerals grid place-items-center rounded-full text-lg leading-none font-semibold transition-colors duration-150 sm:text-xl',
              isSelected
                ? 'bg-primary text-primary-foreground'
                : isToday
                  ? 'bg-tape text-tape-foreground'
                  : cn('group-hover:bg-muted', hasExercises ? 'text-foreground' : 'text-muted-foreground'),
            )}
          >
            {day.date.getDate()}
          </span>
        </span>
        {summary?.status === 'trainer_edited' && (
          <span className="absolute -top-0.5 -right-1 h-1.5 w-3 -skew-x-12 rounded-xs bg-tape ring-2 ring-(--tile-surface)" />
        )}
      </span>
      {isToday && isSelected && (
        <span
          aria-hidden
          className="absolute bottom-0.5 left-1/2 h-1 w-3 -translate-x-1/2 -skew-x-12 rounded-xs bg-tape"
        />
      )}
    </button>
  );
}

function weekdayNames(week: readonly WeekDay[]) {
  return week.map((day) => day.date.toLocaleDateString(undefined, { weekday: 'short' }));
}

function WeekdayLabels({ names, todayColumn }: { names: readonly string[]; todayColumn: number }) {
  return (
    <div aria-hidden className="grid w-full grid-cols-7">
      {names.map((name, column) => (
        <span
          key={name}
          className={cn(
            'text-center font-display text-xs font-semibold tracking-widest uppercase',
            column === todayColumn ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {name}
        </span>
      ))}
    </div>
  );
}

function DayStripSkeleton() {
  const names = weekdayNames(currentWeek());
  return (
    <section aria-label="Choose a day" className={STRIP}>
      <WeekdayLabels names={names} todayColumn={-1} />
      <div className="grid w-full grid-cols-7">
        {names.map((name) => (
          <div key={name} className={CELL}>
            <Skeleton className={cn('rounded-full', CIRCLE)} />
          </div>
        ))}
      </div>
    </section>
  );
}

interface WeekRowProps {
  week: readonly WeekDay[];
  selected: string;
  todayIso: string;
  dimmedOutside?: Date;
  isLoading: boolean;
  summaries: ReadonlyMap<string, DaySummary>;
  onSelect: (iso: string) => void;
}

function WeekRow({ week, selected, todayIso, dimmedOutside, isLoading, summaries, onSelect }: WeekRowProps) {
  return (
    <div className="grid grid-cols-7">
      {week.map((day) => (
        <DayTile
          key={day.iso}
          day={day}
          todayIso={todayIso}
          isSelected={day.iso === selected}
          isDimmed={dimmedOutside !== undefined && day.date.getMonth() !== dimmedOutside.getMonth()}
          isLoading={isLoading}
          summary={summaries.get(day.iso)}
          onSelect={() => onSelect(day.iso)}
        />
      ))}
    </div>
  );
}

interface DayStripProps {
  selected: string;
  todayIso: string;
  onSelect: (iso: string) => void;
}

// The chosen day's week as circles under a fixed Monday-to-Sunday row of names. The whole month of today opens in
// a popover over the page, as wide as the strip so its columns sit under the same names, and takes no room of its own.
function DayStripRoot({ selected, todayIso, onSelect }: DayStripProps) {
  const trpc = useTRPC();
  const [isOpen, setIsOpen] = useState(false);
  const today = fromIsoDate(todayIso) ?? new Date();
  const selectedWeek = currentWeek(fromIsoDate(selected) ?? today);
  const month = monthWeeks(today);
  const from = [selectedWeek[0]!.iso, month[0]![0]!.iso].sort()[0]!;
  const to = [selectedWeek[6]!.iso, month.at(-1)![6]!.iso].sort().at(-1)!;
  const daysQuery = useQuery(trpc.plans.listDays.queryOptions({ from, to }));
  const summaries = new Map<string, DaySummary>(daysQuery.data?.map((day) => [day.planDate, day]));
  const todayColumn = (today.getDay() + 6) % 7;
  const monthTitle = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const rowProps = { selected, todayIso, isLoading: daysQuery.isPending, summaries };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverAnchor asChild>
        <section aria-label="Choose a day" className={STRIP}>
          <WeekdayLabels names={weekdayNames(selectedWeek)} todayColumn={todayColumn} />
          <div className="w-full">
            <WeekRow week={selectedWeek} onSelect={onSelect} {...rowProps} />
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
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="xs"
              className="absolute inset-x-0 top-full mx-auto -mt-3 h-6 w-fit rounded-full pointer-fine:opacity-0 pointer-fine:transition-opacity pointer-fine:group-has-focus-visible/strip:opacity-100 pointer-fine:group-hover/strip:opacity-100 data-[state=open]:opacity-100"
            >
              Show this Month
              <ChevronDownIcon className={cn('transition-transform duration-300', isOpen && 'rotate-180')} />
            </Button>
          </PopoverTrigger>
        </section>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={16}
        collisionPadding={16}
        style={{ transformOrigin: 'top' }}
        className="flex w-(--radix-popover-trigger-width) flex-col gap-2 [--tile-surface:var(--popover)]"
      >
        <h2 className="font-display text-xl font-bold tracking-wide leading-loose uppercase w-full text-center mb-2">
          {monthTitle}
        </h2>
        <WeekdayLabels names={weekdayNames(selectedWeek)} todayColumn={todayColumn} />
        <div>
          {month.map((week) => (
            <WeekRow
              key={week[0]!.iso}
              week={week}
              dimmedOutside={today}
              onSelect={(iso) => {
                onSelect(iso);
                setIsOpen(false);
              }}
              {...rowProps}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const DayStrip = Object.assign(DayStripRoot, { Skeleton: DayStripSkeleton });
