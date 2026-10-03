'use client';

import type { MuscleId } from '@cadence/shared/schemas/muscles';
import { useQuery } from '@tanstack/react-query';
import { CalendarSearchIcon, CalendarX2Icon } from 'lucide-react';
import { useState } from 'react';
import { ExerciseRow } from '@/app/(member)/plan/exercise-row';
import { MuscleDetail } from '@/app/(member)/plan/muscle-detail';
import { DatePicker } from '@/components/date-picker';
import { EmptyState } from '@/components/empty-state';
import { MuscleLoadView } from '@/components/muscle-map/muscle-load-view';
import { QueryError } from '@/components/query-error';
import { Badge } from '@/components/ui/badge';
import { useLaggedValue } from '@/hooks/use-lagged-value';
import { useUrlState } from '@/hooks/use-url-state';
import { toIsoDate } from '@/lib/calendar-date';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

const isIsoDate = (raw: string): raw is string => /^\d{4}-\d{2}-\d{2}$/.test(raw);

function lastDays(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (index + 1));
    return date;
  }).reverse();
}

// Always read-only, regardless of which date is picked - history is for browsing, not editing.
export function PlanHistory() {
  const trpc = useTRPC();
  const [selectedDate, setSelectedDate] = useUrlState('date', '', isIsoDate);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleId | null>(null);
  const recentDays = lastDays(7);

  const planQueryFor = (date: string) => ({
    ...trpc.plans.getByDate.queryOptions({ date: date || '1970-01-01' }),
    enabled: date.length > 0,
  });

  // The day chips react instantly to selectedDate, but the result area keeps showing the previous day
  // (shownDate, already cached) until the new day loads, so a fast load swaps content in one step.
  const selectedQuery = useQuery(planQueryFor(selectedDate));
  const shownDate = useLaggedValue(selectedDate, selectedDate.length > 0 && selectedQuery.isPending);
  const planQuery = useQuery(planQueryFor(shownDate));

  return (
    <section aria-label="Plan history" className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-col gap-4 border-b px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold tracking-wide uppercase">Past plans</h2>
            <p className="text-sm text-muted-foreground">Pick a day from the last week, or any date.</p>
          </div>
          <DatePicker
            aria-label="Plan date"
            placeholder="Any date"
            max={toIsoDate(new Date())}
            value={selectedDate}
            onChange={setSelectedDate}
            isClearable
            className="sm:w-48"
          />
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {recentDays.map((date) => {
            const iso = toIsoDate(date);
            const isSelected = iso === selectedDate;
            return (
              <button
                key={iso}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedDate(iso)}
                className={cn(
                  'flex min-w-14 flex-1 flex-col items-center rounded-md border px-2 py-2 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/45',
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input hover:border-foreground/35 hover:bg-muted',
                )}
              >
                <span
                  className={cn(
                    'font-display text-xs font-semibold tracking-widest uppercase',
                    isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground',
                  )}
                >
                  {date.toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
                <span className="numerals text-2xl leading-none font-bold">{date.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!shownDate && (
        <EmptyState
          icon={CalendarSearchIcon}
          title="Pick a day"
          description="The plan you had that day shows up here."
        />
      )}
      {shownDate &&
        planQuery.isPending &&
        Array.from({ length: 3 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
          <ExerciseRow.Skeleton key={index} />
        ))}
      {shownDate && planQuery.isError && (
        <QueryError
          title="We couldn't load that plan"
          onRetry={() => planQuery.refetch()}
          isRetrying={planQuery.isRefetching}
          className="m-5 sm:m-6"
        />
      )}
      {shownDate && planQuery.isSuccess && planQuery.data === null && (
        <EmptyState icon={CalendarX2Icon} title="Rest day" description="There's no plan for this date." />
      )}
      {shownDate && planQuery.data && (
        <div>
          <div className="flex items-center justify-between gap-2 px-5 pt-4 sm:px-6">
            <p className="text-sm text-muted-foreground">
              <span className="numerals text-base font-bold text-foreground">
                {planQuery.data.exercises.filter((exercise) => exercise.completed).length}/
                {planQuery.data.exercises.length}
              </span>{' '}
              completed
            </p>
            {planQuery.data.status === 'trainer_edited' && <Badge variant="tape">Edited by a trainer</Badge>}
          </div>
          <div className="border-b px-5 py-5 sm:px-6">
            <MuscleLoadView
              isSplit
              load={planQuery.data.muscleLoad}
              label={`Muscles worked on ${shownDate}`}
              selected={selectedMuscle}
              onSelectedChange={setSelectedMuscle}
              detail={(muscle) => <MuscleDetail muscle={muscle} exercises={planQuery.data?.exercises ?? []} />}
            />
          </div>
          {planQuery.data.exercises.map((exercise, index) => (
            <ExerciseRow
              key={exercise.id}
              index={index}
              name={exercise.exerciseName}
              muscles={exercise.muscles}
              isDimmed={selectedMuscle !== null && !exercise.muscles.some((entry) => entry.muscle === selectedMuscle)}
              instructions={exercise.instructions}
              sets={exercise.sets}
              reps={exercise.reps}
              load={exercise.load}
              notes={exercise.notes}
              completed={exercise.completed}
              isPerformable={exercise.isPerformable}
              equipmentDown={exercise.equipmentDown}
            />
          ))}
        </div>
      )}
    </section>
  );
}
