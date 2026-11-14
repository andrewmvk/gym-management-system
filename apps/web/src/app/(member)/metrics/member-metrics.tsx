'use client';

import { useQuery } from '@tanstack/react-query';
import { ChartNoAxesColumnIcon, TargetIcon } from 'lucide-react';
import { useMemo } from 'react';
import { DateRangePicker } from '@/components/date-range-picker';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { HelpTip } from '@/components/help-tip';
import { MuscleLoadView } from '@/components/muscle-map/muscle-load-view';
import { PanelSection as Section } from '@/components/panel-section';
import { QueryError } from '@/components/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLaggedValue } from '@/hooks/use-lagged-value';
import { useUrlState } from '@/hooks/use-url-state';
import { addDays, toIsoDate } from '@/lib/calendar-date';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { useTRPC } from '@/lib/trpc';

const DEFAULT_RANGE_DAYS = 30;

const isIsoDate = (raw: string): raw is string => /^\d{4}-\d{2}-\d{2}$/.test(raw);

function rangeOfLastDays(days: number) {
  const today = new Date();
  return { from: toIsoDate(addDays(today, -(days - 1))), to: toIsoDate(today) };
}

function Figure({ label, value, unit, help }: { label: string; value: string; unit: string; help: string }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-4 sm:px-6">
      <dt className="flex items-center gap-1 font-display text-sm font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
        <HelpTip text={help} />
      </dt>
      <dd className="flex items-baseline gap-1.5">
        <span className="numerals font-display text-4xl leading-none font-bold">{value}</span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </dd>
    </div>
  );
}

function FigureSkeleton() {
  return (
    <div className="flex flex-col gap-1 px-5 py-4 sm:px-6">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-10 w-20" />
    </div>
  );
}

function BreakdownTable({ heading, rows }: { heading: string; rows: { name: string; completed: number }[] }) {
  const { t, tx } = useI18n();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{heading}</TableHead>
          <TableHead className="w-28 text-right">{t('Completed')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.name}>
            <TableCell className="font-medium">{tx(row.name)}</TableCell>
            <TableCell className="numerals text-right text-base font-bold">{row.completed}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function BreakdownSkeleton() {
  const { t } = useI18n();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('Exercise')}</TableHead>
          <TableHead className="w-28 text-right">{t('Completed')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 4 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
          <TableRow key={index}>
            <TableCell>
              <Skeleton className="h-5 w-40" />
            </TableCell>
            <TableCell>
              <Skeleton className="ml-auto h-5 w-8" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ToolbarSkeleton() {
  return <Skeleton className="h-10 w-full sm:w-96" />;
}

function MemberMetricsSkeleton() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <ToolbarSkeleton />
      <Section title={t('Summary')}>
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
            <div key={index} className="bg-card">
              <FigureSkeleton />
            </div>
          ))}
        </div>
      </Section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={t('By exercise')}>
          <BreakdownSkeleton />
        </Section>
        <Section title={t('Muscles worked')}>
          <MuscleLoadView.Skeleton className="px-5 py-5 sm:px-6" />
        </Section>
      </div>
    </div>
  );
}

function MemberMetricsRoot() {
  const { t, formatPlanDate, formatNumber } = useI18n();
  const trpc = useTRPC();
  const defaults = rangeOfLastDays(DEFAULT_RANGE_DAYS);
  const [from, setFrom] = useUrlState('from', defaults.from, isIsoDate);
  const [to, setTo] = useUrlState('to', defaults.to, isIsoDate);

  // An inverted range (a hand-edited URL) is treated as the default one rather than sent to the server.
  const isValid = from <= to;
  // Memoized because useLaggedValue keeps it in state and in effect dependencies: a fresh object per render would loop.
  const { from: defaultFrom, to: defaultTo } = defaults;
  const range = useMemo(
    () => (isValid ? { from, to } : { from: defaultFrom, to: defaultTo }),
    [isValid, from, to, defaultFrom, defaultTo],
  );

  const rangeQuery = useQuery(trpc.metrics.mine.queryOptions(range));
  const shown = useLaggedValue(range, rangeQuery.isPending);
  const metricsQuery = useQuery(trpc.metrics.mine.queryOptions(shown));
  const oneDecimal = (value: number) => formatNumber(value, { maximumFractionDigits: 1 });

  const toolbar = (
    <DateRangePicker
      aria-label={t('Date range')}
      value={range}
      onChange={(next) => {
        setFrom(next.from);
        setTo(next.to);
      }}
      max={toIsoDate(new Date())}
      className="sm:w-fit"
    />
  );

  if (metricsQuery.isPending) {
    return (
      <Deferred>
        <MemberMetricsSkeleton />
      </Deferred>
    );
  }

  if (metricsQuery.isError) {
    return (
      <div className="flex flex-col gap-4">
        {toolbar}
        <QueryError
          title={t("We couldn't load your metrics")}
          onRetry={() => metricsQuery.refetch()}
          isRetrying={metricsQuery.isRefetching}
        />
      </div>
    );
  }

  const metrics = metricsQuery.data;
  const { goalProgress, exerciseBreakdown } = metrics;
  const isEmpty = metrics.daysTrained === 0 && goalProgress.plannedExercises === 0;
  const period = { from: formatPlanDate(metrics.from), to: formatPlanDate(metrics.to) };

  return (
    <div className="flex flex-col gap-4">
      {toolbar}

      {isEmpty ? (
        <div className="rounded-lg border bg-card">
          <EmptyState
            icon={ChartNoAxesColumnIcon}
            title={t('Nothing to show yet')}
            description={t('No check-ins or plans between {from} and {to}. Try a wider range.', period)}
          />
        </div>
      ) : (
        <>
          <Section
            title={t('Summary')}
            description={t('{from} to {to}. Days trained count check-ins at the gym door, nothing else.', period)}
          >
            <dl className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-card">
                <Figure
                  label={t('Days trained')}
                  value={String(metrics.daysTrained)}
                  unit={t('days with a check-in')}
                  help={t('Days with a check-in at the gym door in this range. Plans and ticks do not count.')}
                />
              </div>
              <div className="bg-card">
                <Figure
                  label={t('Frequency')}
                  value={oneDecimal(metrics.trainingFrequency)}
                  unit={t('days trained per week')}
                  help={t('Days trained divided by the number of weeks in this range.')}
                />
              </div>
              <div className="bg-card">
                <Figure
                  label={t('Reps completed')}
                  value={oneDecimal(metrics.trainingVolume)}
                  unit={t('reps in total')}
                  help={t(
                    'Sets times reps of every exercise you ticked off in this range, added up. The load is not counted.',
                  )}
                />
              </div>
              <div className="bg-card">
                <Figure
                  label={t('Plan completed')}
                  value={`${Math.round(goalProgress.completionRate * 100)}%`}
                  unit={t('{done} of {total} exercises', {
                    done: goalProgress.completedExercises,
                    total: goalProgress.plannedExercises,
                  })}
                  help={t('Exercises you ticked off divided by the exercises in your plans in this range.')}
                />
              </div>
            </dl>
          </Section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title={t('By exercise')} description={t('Completed exercises in this range.')}>
              {exerciseBreakdown.byExercise.length === 0 ? (
                <EmptyState
                  icon={ChartNoAxesColumnIcon}
                  title={t('No exercises completed')}
                  description={t('Mark exercises as done in your plan to see them here.')}
                />
              ) : (
                <BreakdownTable heading={t('Exercise')} rows={exerciseBreakdown.byExercise} />
              )}
            </Section>
            <Section
              title={t('Muscles worked')}
              description={t(
                'Counted in weighted sets, not reps: a completed set counts once for a primary muscle and half for a supporting one.',
              )}
            >
              {Object.keys(exerciseBreakdown.muscleLoad).length === 0 ? (
                <EmptyState
                  icon={ChartNoAxesColumnIcon}
                  title={t('No exercises completed')}
                  description={t('Mark exercises as done in your plan to see them here.')}
                />
              ) : (
                <MuscleLoadView
                  load={exerciseBreakdown.muscleLoad}
                  label={t('Muscles worked in this range')}
                  className="px-5 py-5 sm:px-6"
                />
              )}
            </Section>
          </div>
        </>
      )}

      <Section title={t('Your goals')} description={t('What you told us in your health profile.')}>
        {goalProgress.goals ? (
          <p className="max-w-prose px-5 py-4 text-pretty whitespace-pre-line sm:px-6">{goalProgress.goals}</p>
        ) : (
          <EmptyState
            icon={TargetIcon}
            title={t('No goals yet')}
            description={t('Add them in your health profile and they show up here next to your progress.')}
          />
        )}
      </Section>
    </div>
  );
}

export const MemberMetrics = Object.assign(MemberMetricsRoot, { Skeleton: MemberMetricsSkeleton });
