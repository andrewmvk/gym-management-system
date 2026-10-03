'use client';

import { useQuery } from '@tanstack/react-query';
import { currentWeek } from '@/app/(member)/home/current-week';
import { Deferred } from '@/components/deferred';
import { PanelSection } from '@/components/panel-section';
import { QueryError } from '@/components/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { toIsoDate } from '@/lib/calendar-date';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

function WeekStripSkeleton() {
  return (
    <PanelSection title="This week">
      <div className="flex flex-col gap-3 px-5 py-4 sm:px-6">
        <Skeleton className="h-9 w-28" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </PanelSection>
  );
}

// Seven slanted segments, Monday to Sunday: cobalt where there was a check-in, outlined for today.
function WeekStripRoot() {
  const trpc = useTRPC();
  const days = currentWeek();
  const todayIso = toIsoDate(new Date());
  const weekQuery = useQuery(trpc.metrics.week.queryOptions({ from: days[0]!.iso, to: days[6]!.iso }));

  if (weekQuery.isPending) {
    return (
      <Deferred>
        <WeekStripSkeleton />
      </Deferred>
    );
  }

  if (weekQuery.isError) {
    return (
      <QueryError
        title="We couldn't load your week"
        onRetry={() => weekQuery.refetch()}
        isRetrying={weekQuery.isRefetching}
      />
    );
  }

  const trained = new Set(weekQuery.data.trainedDates);
  const trainedCount = days.filter((day) => trained.has(day.iso)).length;

  return (
    <PanelSection title="This week">
      <div className="flex flex-col gap-3 px-5 py-4 sm:px-6">
        <p className="text-sm text-muted-foreground">
          <span className="numerals text-3xl leading-none font-bold text-foreground">{trainedCount}</span>
          <span className="numerals text-xl font-bold">/7</span> days at the gym
        </p>
        <ol className="grid grid-cols-7 gap-1.5">
          {days.map((day) => {
            const isTrained = trained.has(day.iso);
            const isToday = day.iso === todayIso;
            return (
              <li key={day.iso} className="flex flex-col items-center gap-1">
                <span
                  role="img"
                  aria-label={`${day.date.toLocaleDateString(undefined, { weekday: 'long' })}: ${isTrained ? 'checked in' : 'no check-in'}${isToday ? ' (today)' : ''}`}
                  className={cn(
                    'h-10 w-full -skew-x-12 rounded-xs',
                    isTrained ? 'bg-primary' : 'bg-muted',
                    isToday && 'outline-2 outline-offset-2 outline-foreground',
                  )}
                />
                <span
                  className={cn(
                    'font-display text-xs font-semibold tracking-widest uppercase',
                    isToday ? 'text-foreground' : 'text-muted-foreground',
                  )}
                  aria-hidden
                >
                  {day.date.toLocaleDateString(undefined, { weekday: 'narrow' })}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </PanelSection>
  );
}

export const WeekStrip = Object.assign(WeekStripRoot, { Skeleton: WeekStripSkeleton });
