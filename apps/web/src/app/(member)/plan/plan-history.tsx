'use client';

import type { MuscleId } from '@cadence/shared/schemas/muscles';
import { useQuery } from '@tanstack/react-query';
import { CalendarSearchIcon, CalendarX2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useCoach } from '@/app/(member)/coach/coach-context';
import { CoachBar } from '@/app/(member)/plan/coach-bar';
import { ExerciseRow } from '@/app/(member)/plan/exercise-row';
import { MuscleDetail } from '@/app/(member)/plan/muscle-detail';
import { TrainerNotes } from '@/app/(member)/plan/trainer-notes';
import { useUpdateExerciseNumbers } from '@/app/(member)/plan/use-update-exercise-numbers';
import { DatePicker } from '@/components/date-picker';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { MuscleLoadView } from '@/components/muscle-map/muscle-load-view';
import { QueryError } from '@/components/query-error';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLaggedValue } from '@/hooks/use-lagged-value';
import { useUrlState } from '@/hooks/use-url-state';
import { fromIsoDate, toIsoDate } from '@/lib/calendar-date';
import { formatPlanDate } from '@/lib/format';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

const isIsoDate = (raw: string): raw is string => /^\d{4}-\d{2}-\d{2}$/.test(raw);

const UPCOMING_SKELETON_CHIPS = 3;

function lastDays(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (index + 1));
    return date;
  }).reverse();
}

interface DayChipProps {
  iso: string;
  isSelected: boolean;
  onSelect: () => void;
  exerciseCount?: number;
}

function DayChip({ iso, isSelected, onSelect, exerciseCount }: DayChipProps) {
  const date = fromIsoDate(iso);
  if (!date) return null;
  const hasCount = exerciseCount !== undefined;
  const fullDate = formatPlanDate(iso, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      aria-label={
        hasCount ? `${fullDate}, ${exerciseCount} ${exerciseCount === 1 ? 'exercise' : 'exercises'}` : fullDate
      }
      onClick={onSelect}
      className={cn(
        'flex shrink-0 flex-col items-center rounded-md border px-2 py-2 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/45',
        hasCount ? 'min-w-24' : 'min-w-14 flex-1',
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
      {hasCount && (
        <span className={cn('text-xs', isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
          <span className="numerals text-sm font-semibold">{exerciseCount}</span>{' '}
          {exerciseCount === 1 ? 'exercise' : 'exercises'}
        </span>
      )}
    </button>
  );
}

function ChipGroupLabel({ children }: { children: string }) {
  return (
    <p className="font-display text-sm font-semibold tracking-widest text-muted-foreground uppercase">{children}</p>
  );
}

// Past days are read-only history. Days that have not come yet show the plan and its muscle map with the
// ticks switched off: a plan can only be ticked on the day it is for.
export function PlanHistory() {
  const trpc = useTRPC();
  const [selectedDate, setSelectedDate] = useUrlState('date', '', isIsoDate);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleId | null>(null);
  const todayIso = toIsoDate(new Date());
  const recentDays = lastDays(7);

  const upcomingQuery = useQuery(trpc.plans.listUpcoming.queryOptions());
  // Today's plan has its own tab, so the chips only offer the days after it.
  const upcoming = (upcomingQuery.data ?? []).filter((entry) => entry.planDate > todayIso);
  const latestPlannedDate = upcoming.at(-1)?.planDate ?? todayIso;

  const planQueryFor = (date: string) => ({
    ...trpc.plans.getByDate.queryOptions({ date: date || '1970-01-01' }),
    enabled: date.length > 0,
  });

  // The day chips react instantly to selectedDate, but the result area keeps showing the previous day
  // (shownDate, already cached) until the new day loads, so a fast load swaps content in one step.
  const selectedQuery = useQuery(planQueryFor(selectedDate));
  const shownDate = useLaggedValue(selectedDate, selectedDate.length > 0 && selectedQuery.isPending);
  const planQuery = useQuery(planQueryFor(shownDate));
  const isFuture = shownDate > todayIso;
  const updateNumbers = useUpdateExerciseNumbers();
  const { selection, setSelection } = useCoach();

  // Only days that can still be done are talked about from here, and the pick never outlives this view.
  useEffect(() => () => setSelection(null), [setSelection]);
  const shownExerciseIds = planQuery.data?.exercises.map((exercise) => exercise.exerciseId);
  useEffect(() => {
    if (selection && (!isFuture || !shownExerciseIds?.includes(selection.exerciseId))) setSelection(null);
  }, [selection, isFuture, shownExerciseIds, setSelection]);

  return (
    <section aria-label="Plans by day" className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-col gap-4 border-b px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold tracking-wide uppercase">Other days</h2>
            <p className="text-sm text-muted-foreground">
              Pick a day from the last week or the days ahead, or any date.
            </p>
          </div>
          <DatePicker
            aria-label="Plan date"
            placeholder="Any date"
            max={latestPlannedDate}
            value={selectedDate}
            onChange={setSelectedDate}
            isClearable
            className="sm:w-48"
          />
        </div>
        <div className="flex flex-col gap-2">
          <ChipGroupLabel>Last 7 days</ChipGroupLabel>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {recentDays.map((date) => {
              const iso = toIsoDate(date);
              return (
                <DayChip key={iso} iso={iso} isSelected={iso === selectedDate} onSelect={() => setSelectedDate(iso)} />
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <ChipGroupLabel>Coming up</ChipGroupLabel>
          {upcomingQuery.isPending && (
            <Deferred>
              <div className="flex gap-1.5">
                {Array.from({ length: UPCOMING_SKELETON_CHIPS }, (_, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
                  <Skeleton key={index} className="h-18 w-24 shrink-0" />
                ))}
              </div>
            </Deferred>
          )}
          {upcomingQuery.isError && (
            <QueryError
              title="We couldn't load your upcoming plans"
              onRetry={() => upcomingQuery.refetch()}
              isRetrying={upcomingQuery.isRefetching}
              className="py-6"
            />
          )}
          {upcomingQuery.isSuccess && upcoming.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No plans for the days ahead yet. Ask your coach in the chat to plan one and it shows up here.
            </p>
          )}
          {upcoming.length > 0 && (
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {upcoming.map((entry) => (
                <DayChip
                  key={entry.planDate}
                  iso={entry.planDate}
                  exerciseCount={entry.exerciseCount}
                  isSelected={entry.planDate === selectedDate}
                  onSelect={() => setSelectedDate(entry.planDate)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {!shownDate && (
        <EmptyState
          icon={CalendarSearchIcon}
          title="Pick a day"
          description="The plan you had that day, or one planned ahead, shows up here."
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
        <EmptyState
          icon={CalendarX2Icon}
          title={isFuture ? 'No plan yet' : 'Rest day'}
          description={
            isFuture
              ? 'Nothing is planned for this day yet. Ask your coach in the chat to plan it.'
              : "There's no plan for this date."
          }
        />
      )}
      {shownDate && planQuery.data && (
        <div>
          <div className="flex items-start justify-between gap-2 px-5 pt-4 sm:px-6">
            <div className="flex min-w-0 flex-col gap-0.5">
              <h3 className="font-display text-xl font-bold tracking-wide uppercase">
                {formatPlanDate(shownDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-sm text-muted-foreground">
                <span className="numerals text-base font-bold text-foreground">
                  {isFuture
                    ? planQuery.data.exercises.length
                    : `${planQuery.data.exercises.filter((exercise) => exercise.completed).length}/${planQuery.data.exercises.length}`}
                </span>{' '}
                {isFuture ? 'exercises planned' : 'completed'}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              {isFuture && <Badge variant="pending">Upcoming</Badge>}
              {planQuery.data.status === 'trainer_edited' ? (
                <Badge variant="tape">Edited by a trainer</Badge>
              ) : (
                planQuery.data.trainerNotes.length > 0 && <Badge variant="secondary">Trainer note</Badge>
              )}
            </div>
          </div>
          <TrainerNotes notes={planQuery.data.trainerNotes} className="mt-4 border-b px-5 pb-4 sm:px-6" />
          <div className="border-b px-5 py-5 sm:px-6">
            <MuscleLoadView
              isSplit
              load={planQuery.data.muscleLoad}
              label={
                isFuture
                  ? `Muscles planned for ${formatPlanDate(shownDate)}`
                  : `Muscles worked on ${formatPlanDate(shownDate)}`
              }
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
              isTickLocked={isFuture}
              isSelected={isFuture && selection?.exerciseId === exercise.exerciseId}
              onSelect={
                isFuture
                  ? () =>
                      setSelection(
                        selection?.exerciseId === exercise.exerciseId
                          ? null
                          : { exerciseId: exercise.exerciseId, name: exercise.exerciseName },
                      )
                  : undefined
              }
              onEditNumbers={
                isFuture
                  ? (numbers) => updateNumbers.mutateAsync({ planExerciseId: exercise.id, ...numbers })
                  : undefined
              }
              isEditPending={updateNumbers.isPending && updateNumbers.variables?.planExerciseId === exercise.id}
            />
          ))}
          {isFuture && <CoachBar />}
        </div>
      )}
    </section>
  );
}
