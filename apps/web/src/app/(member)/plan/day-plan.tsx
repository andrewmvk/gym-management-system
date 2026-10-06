'use client';

import type { MuscleId } from '@cadence/shared/schemas/muscles';
import { useQuery } from '@tanstack/react-query';
import { CalendarX2Icon, DumbbellIcon } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { mentionKey, useCoach } from '@/app/(member)/coach/coach-context';
import { ExerciseRow } from '@/app/(member)/plan/exercise-row';
import { NeedsReviewNotice } from '@/app/(member)/plan/needs-review-notice';
import { PlanBuildProgress } from '@/app/(member)/plan/plan-build-progress';
import { type DayRelation, describeDay, relationOf } from '@/app/(member)/plan/plan-day';
import { PlanMusclePanel } from '@/app/(member)/plan/plan-muscle-panel';
import { TrainerNotes } from '@/app/(member)/plan/trainer-notes';
import { useRebuildPlan } from '@/app/(member)/plan/use-rebuild-plan';
import { useToggleExercise } from '@/app/(member)/plan/use-toggle-exercise';
import { useUpdateExerciseNumbers } from '@/app/(member)/plan/use-update-exercise-numbers';
import { AiButton } from '@/components/ai-button';
import { AiMark } from '@/components/ai-mark';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { QueryError } from '@/components/query-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLaggedValue } from '@/hooks/use-lagged-value';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface PlanShellProps {
  title: ReactNode;
  tally: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}

function PlanShell({ title, tally, aside, children }: PlanShellProps) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="kit-corner flex items-end justify-between gap-4 bg-kit pt-4 pr-20 pb-3 pl-5 text-kit-foreground sm:pl-6">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-display text-sm font-semibold tracking-widest text-kit-muted uppercase">{title}</h2>
          {tally}
        </div>
        {aside && <div className="flex shrink-0 flex-col items-end gap-2 pb-1 text-right">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

// Filled for what is done; dashed outlines for a day that has not come, so a plan ahead never reads as undone.
function ProgressSegments({ states, isPlanned }: { states: boolean[]; isPlanned: boolean }) {
  return (
    <div
      className="grid gap-1 border-b px-5 py-3 sm:px-6"
      style={{ gridTemplateColumns: `repeat(${states.length}, minmax(0, 1fr))` }}
      aria-hidden
    >
      {states.map((isDone, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: one fixed segment per exercise slot, never reordered.
          key={index}
          className={cn(
            'h-2 -skew-x-12 rounded-xs transition-colors duration-500',
            isPlanned ? 'border border-dashed border-foreground/40' : isDone ? 'bg-primary' : 'bg-muted',
          )}
        />
      ))}
    </div>
  );
}

// h-12 is the line box of the text-5xl tally at leading-none; h-5 is the line box of the text-sm title.
function DayPlanSkeleton({ date, todayIso }: { date?: string; todayIso?: string }) {
  return (
    <PlanShell
      title={date && todayIso ? describeDay(date, todayIso) : <Skeleton className="h-5 w-48 bg-white/12" />}
      tally={<Skeleton className="h-12 w-24 bg-white/12" />}
    >
      <div className="border-b px-5 py-3 sm:px-6">
        <Skeleton className="h-2 w-full" />
      </div>
      <PlanMusclePanel.Skeleton />
      {Array.from({ length: 4 }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
        <ExerciseRow.Skeleton key={index} />
      ))}
    </PlanShell>
  );
}

// Today's plan has its own query, shared with Home and the coach so a tick shows everywhere at once.
function usePlanForDate(date: string, todayIso: string) {
  const trpc = useTRPC();
  const todayQuery = useQuery({ ...trpc.plans.getToday.queryOptions(), enabled: date === todayIso });
  const dateQuery = useQuery({ ...trpc.plans.getByDate.queryOptions({ date }), enabled: date !== todayIso });
  return date === todayIso ? todayQuery : dateQuery;
}

type PlanQuery = ReturnType<typeof usePlanForDate>;

interface DayPlanBodyProps {
  date: string;
  todayIso: string;
  query: PlanQuery;
}

function statusLine(relation: DayRelation, remaining: number) {
  if (relation === 'future') return 'Ticks open on the day';
  if (remaining === 0) return relation === 'today' ? 'All done. Nice work.' : 'All done';
  return relation === 'today' ? `${remaining} to go` : `${remaining} not done`;
}

function NoPlan({ relation }: { relation: DayRelation }) {
  const coach = useCoach();
  const generate = useRebuildPlan({ isErrorInline: true });

  if (relation === 'today') {
    return (
      <>
        {generate.isError ? (
          <QueryError
            title="We couldn't build your plan right now"
            onRetry={generate.requestRebuild}
            className="m-5 sm:m-6"
          />
        ) : (
          <EmptyState
            icon={DumbbellIcon}
            title="No plan yet for today"
            description="Your plan is built from your health profile and everything you've told your coach."
            action={
              <AiButton
                size="lg"
                isPending={generate.isPending}
                pendingLabel="Building your plan..."
                onClick={generate.requestRebuild}
              >
                Build my plan
              </AiButton>
            }
          />
        )}
        {generate.isPending && generate.streamed.length > 0 && (
          <PlanBuildProgress exercises={generate.streamed} className="border-t" />
        )}
        {generate.dialog}
      </>
    );
  }

  if (relation === 'future') {
    return (
      <EmptyState
        icon={CalendarX2Icon}
        title="No plan yet"
        description="Nothing is planned for this day yet. Ask your coach to plan it and it shows up here."
        action={
          <Button onClick={() => coach.setIsOpen(true)}>
            <AiMark data-icon="inline-start" />
            Ask your coach
          </Button>
        }
      />
    );
  }

  return <EmptyState icon={CalendarX2Icon} title="Rest day" description="There's no plan for this date." />;
}

function DayPlanBody({ date, todayIso, query }: DayPlanBodyProps) {
  const relation = relationOf(date, todayIso);
  const isToday = relation === 'today';
  const isFuture = relation === 'future';
  const isPast = relation === 'past';
  const title = describeDay(date, todayIso);

  const coach = useCoach();
  const toggle = useToggleExercise();
  const updateNumbers = useUpdateExerciseNumbers();
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleId | null>(null);
  const markedKeys = new Set(coach.mentions.map(mentionKey));

  if (query.isError) {
    return (
      <PlanShell
        title={title}
        tally={<p className="numerals text-5xl leading-none font-extrabold text-kit-muted">-</p>}
      >
        <QueryError
          title="We couldn't load this plan"
          onRetry={() => query.refetch()}
          isRetrying={query.isRefetching}
          className="m-5 sm:m-6"
        />
      </PlanShell>
    );
  }

  const plan = query.data;
  if (!plan) {
    return (
      <PlanShell
        title={title}
        tally={<p className="numerals text-5xl leading-none font-extrabold text-kit-muted">{isToday ? '0' : '-'}</p>}
      >
        <NoPlan relation={relation} />
      </PlanShell>
    );
  }

  const doneStates = plan.exercises.map((exercise) => exercise.completed);
  const doneCount = doneStates.filter(Boolean).length;
  const remaining = plan.exercises.length - doneCount;
  const status = statusLine(relation, remaining);

  return (
    <PlanShell
      title={title}
      tally={
        isFuture ? (
          <p className="numerals text-5xl leading-none font-extrabold">
            {plan.exercises.length}
            <span className="ml-2 font-display text-xl font-semibold tracking-widest text-kit-muted uppercase">
              planned
            </span>
          </p>
        ) : (
          <p className="numerals text-5xl leading-none font-extrabold" aria-live="polite">
            {doneCount}
            <span className="text-kit-muted">/{plan.exercises.length}</span>
            <span className="sr-only"> exercises done</span>
          </p>
        )
      }
      aside={
        <>
          {plan.status === 'trainer_edited' ? (
            <Badge variant="tape">Edited by a trainer</Badge>
          ) : (
            plan.trainerNotes.length > 0 && <Badge variant="secondary">Trainer note</Badge>
          )}
          <p className="text-sm text-kit-muted">{status}</p>
        </>
      }
    >
      {plan.needsReview && <NeedsReviewNotice exercises={plan.exercises} canRebuild={isToday} className="border-b" />}
      <TrainerNotes notes={plan.trainerNotes} className="border-b px-5 py-4 sm:px-6" />
      {plan.exercises.length > 0 && <ProgressSegments states={doneStates} isPlanned={isFuture} />}
      <PlanMusclePanel
        date={date}
        todayIso={todayIso}
        muscleLoad={plan.muscleLoad}
        exercises={plan.exercises}
        selected={selectedMuscle}
        onSelectedChange={setSelectedMuscle}
      />
      {plan.exercises.map((exercise, index) => (
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
          disabled={toggle.isPending}
          isTickLocked={isFuture}
          onToggle={isToday ? (completed) => toggle.mutate({ planExerciseId: exercise.id, completed }) : undefined}
          pointing={
            isPast
              ? undefined
              : {
                  isActive: coach.isPointing,
                  isMarked: markedKeys.has(`exercise:${exercise.exerciseId}`),
                  onPoint: () =>
                    coach.toggleMention({
                      type: 'exercise',
                      exerciseId: exercise.exerciseId,
                      name: exercise.exerciseName,
                    }),
                }
          }
          onEditNumbers={
            isPast ? undefined : (numbers) => updateNumbers.mutateAsync({ planExerciseId: exercise.id, ...numbers })
          }
          isEditPending={updateNumbers.isPending && updateNumbers.variables?.planExerciseId === exercise.id}
        />
      ))}
    </PlanShell>
  );
}

interface DayPlanProps {
  date: string;
  todayIso: string;
}

// The plan of the day picked in the day strip: today's to tick off, a day gone by to read, a day ahead to look
// at and change through the coach. Changing the day keeps the current plan on screen until the next one has
// loaded, so a fast load swaps the content in one step. What the coach can be pointed at is registered here,
// above the per-day body, so pointing mode survives moving between days that can still be done.
function DayPlanRoot({ date, todayIso }: DayPlanProps) {
  const coach = useCoach();
  const selectedQuery = usePlanForDate(date, todayIso);
  const shownDate = useLaggedValue(date, selectedQuery.isPending);
  const planQuery = usePlanForDate(shownDate, todayIso);
  const [hasSettled, setHasSettled] = useState(false);

  const isPast = relationOf(shownDate, todayIso) === 'past';
  const canPointHere = !isPast && Boolean(planQuery.data);
  const { registerTargets, setViewedDate } = coach;

  useEffect(() => {
    if (!planQuery.isPending) setHasSettled(true);
  }, [planQuery.isPending]);
  useEffect(() => (canPointHere ? registerTargets() : undefined), [canPointHere, registerTargets]);
  useEffect(() => {
    setViewedDate(isPast ? null : shownDate);
    return () => setViewedDate(null);
  }, [isPast, shownDate, setViewedDate]);

  if (planQuery.isPending) {
    const skeleton = <DayPlanSkeleton date={shownDate} todayIso={todayIso} />;
    return hasSettled ? skeleton : <Deferred>{skeleton}</Deferred>;
  }

  return <DayPlanBody key={shownDate} date={shownDate} todayIso={todayIso} query={planQuery} />;
}

export const DayPlan = Object.assign(DayPlanRoot, { Skeleton: DayPlanSkeleton });
