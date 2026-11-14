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
import { type I18n, useI18n } from '@/lib/i18n/i18n-provider';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface PlanShellProps {
  title: ReactNode;
  tally: ReactNode;
  aside?: ReactNode;
  progress?: ReactNode;
  children: ReactNode;
}

// The sleeve stripes run the full height of the ink head, so the progress under the title sits on top of them.
function PlanShell({ title, tally, aside, progress, children }: PlanShellProps) {
  return (
    <section className="overflow-hidden rounded-lg border bg-card">
      <div className="kit-corner bg-kit pt-4 pl-5 text-kit-foreground sm:pl-6">
        <div className="flex items-end justify-between gap-4 pr-20 pb-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="font-display text-sm font-semibold tracking-widest text-kit-muted uppercase">{title}</h2>
            {tally}
          </div>
          {aside && <div className="flex shrink-0 flex-col items-end gap-2 pb-1 text-right">{aside}</div>}
        </div>
        {progress && <div className="pr-5 pb-4 sm:pr-6">{progress}</div>}
      </div>
      {children}
    </section>
  );
}

// Filled for what is done; dashed outlines for a day that has not come, so a plan ahead never reads as undone.
function ProgressSegments({ states, isPlanned }: { states: boolean[]; isPlanned: boolean }) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${states.length}, minmax(0, 1fr))` }} aria-hidden>
      {states.map((isDone, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: one fixed segment per exercise slot, never reordered.
          key={index}
          className={cn(
            'h-2 -skew-x-12 rounded-xs transition-colors duration-500',
            isPlanned ? 'border border-dashed border-kit-foreground/50' : isDone ? 'bg-kit-foreground' : 'bg-card',
          )}
        />
      ))}
    </div>
  );
}

// h-12 is the line box of the text-5xl tally at leading-none; h-5 is the line box of the text-sm title.
function DayPlanSkeleton({ date, todayIso }: { date?: string; todayIso?: string }) {
  const i18n = useI18n();
  return (
    <PlanShell
      title={date && todayIso ? describeDay(i18n, date, todayIso) : <Skeleton className="h-5 w-48 bg-white/12" />}
      tally={<Skeleton className="h-12 w-24 bg-white/12" />}
      progress={<Skeleton className="h-2 w-full bg-white/12" />}
    >
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

function statusLine({ t }: I18n, relation: DayRelation, remaining: number) {
  if (relation === 'future') return t('Ticks open on the day');
  if (remaining === 0) return relation === 'today' ? t('All done. Nice work.') : t('All done');
  return relation === 'today' ? t('{count} to go', { count: remaining }) : t('{count} not done', { count: remaining });
}

function NoPlan({ relation }: { relation: DayRelation }) {
  const { t } = useI18n();
  const coach = useCoach();
  const generate = useRebuildPlan({ isErrorInline: true });

  if (relation === 'today') {
    return (
      <>
        {generate.isError ? (
          <QueryError
            title={t("We couldn't build your plan right now")}
            onRetry={generate.requestRebuild}
            className="m-5 sm:m-6"
          />
        ) : (
          <EmptyState
            icon={DumbbellIcon}
            title={t('No plan yet for today')}
            description={t("Your plan is built from your health profile and everything you've told your coach.")}
            action={
              <AiButton
                size="lg"
                isPending={generate.isPending}
                pendingLabel={t('Building your plan...')}
                onClick={generate.requestRebuild}
              >
                {t('Build my plan')}
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
        title={t('No plan yet')}
        description={t('Nothing is planned for this day yet. Ask your coach to plan it and it shows up here.')}
        action={
          <Button onClick={() => coach.setIsOpen(true)}>
            <AiMark data-icon="inline-start" />
            {t('Ask your coach')}
          </Button>
        }
      />
    );
  }

  return <EmptyState icon={CalendarX2Icon} title={t('Rest day')} description={t("There's no plan for this date.")} />;
}

function DayPlanBody({ date, todayIso, query }: DayPlanBodyProps) {
  const i18n = useI18n();
  const { t, tx } = i18n;
  const relation = relationOf(date, todayIso);
  const isToday = relation === 'today';
  const isFuture = relation === 'future';
  const isPast = relation === 'past';
  const title = describeDay(i18n, date, todayIso);

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
          title={t("We couldn't load this plan")}
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
  const status = statusLine(i18n, relation, remaining);

  return (
    <PlanShell
      title={title}
      tally={
        isFuture ? (
          <p className="numerals text-5xl leading-none font-extrabold">
            {plan.exercises.length}
            <span className="ml-2 font-display text-xl font-semibold tracking-widest text-kit-muted uppercase">
              {t('planned')}
            </span>
          </p>
        ) : (
          <p className="numerals text-5xl leading-none font-extrabold" aria-live="polite">
            <span key={doneCount} className="inline-block animate-tick">
              {doneCount}
            </span>
            <span className="text-kit-muted">/{plan.exercises.length}</span>
            <span className="sr-only"> {t('exercises done')}</span>
          </p>
        )
      }
      progress={plan.exercises.length > 0 && <ProgressSegments states={doneStates} isPlanned={isFuture} />}
      aside={
        <>
          {plan.status === 'trainer_edited' ? (
            <Badge variant="tape">{t('Edited by a trainer')}</Badge>
          ) : (
            plan.trainerNotes.length > 0 && <Badge variant="secondary">{t('Trainer note')}</Badge>
          )}
          <p className="text-sm text-kit-muted">{status}</p>
        </>
      }
    >
      {plan.needsReview && <NeedsReviewNotice exercises={plan.exercises} canRebuild={isToday} className="border-b" />}
      <TrainerNotes notes={plan.trainerNotes} className="border-b px-5 py-4 sm:px-6" />
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
                      name: tx(exercise.exerciseName),
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

  // Picking a day swaps the whole plan; the body fades in so the swap reads as a change, not a flicker.
  return (
    <div key={shownDate} className="animate-in duration-200 fade-in-0">
      <DayPlanBody date={shownDate} todayIso={todayIso} query={planQuery} />
    </div>
  );
}

export const DayPlan = Object.assign(DayPlanRoot, { Skeleton: DayPlanSkeleton });
