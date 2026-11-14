'use client';

import { WEEKDAYS, type Weekday } from '@cadence/shared/schemas/gym';
import { useQuery } from '@tanstack/react-query';
import { DoorOpenIcon, LogInIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { currentWeek } from '@/app/(member)/home/current-week';
import { Deferred } from '@/components/deferred';
import { Skeleton } from '@/components/ui/skeleton';
import { isSameDay } from '@/lib/calendar-date';
import { type I18n, useI18n } from '@/lib/i18n/i18n-provider';
import { useTRPC } from '@/lib/trpc';

const GYM_REFRESH_MS = 60_000;

interface HeroLineProps {
  icon: ReactNode;
  isPending: boolean;
  isError: boolean;
  failedLabel: string;
  onRetry: () => void;
  children: ReactNode;
}

// A failed read is its own state: a dashed chip with a retry, never a made-up value.
function HeroLine({ icon, isPending, isError, failedLabel, onRetry, children }: HeroLineProps) {
  const { t } = useI18n();

  if (isPending) {
    return (
      <Deferred>
        <Skeleton className="h-5 w-60 bg-white/12" />
      </Deferred>
    );
  }
  if (isError) {
    return (
      <p className="flex w-fit items-center gap-2 rounded-sm border border-dashed border-kit-muted px-2 py-0.5">
        <span>{failedLabel}</span>
        <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-4">
          {t('Retry')}
        </button>
      </p>
    );
  }
  return (
    <p className="flex items-center gap-2">
      {icon}
      <span>{children}</span>
    </p>
  );
}

function describeGym(
  { t, weekdayLabel }: I18n,
  data: {
    isOpen: boolean;
    todayHours: { open: string; close: string } | null;
    nextChange: { event: 'opens' | 'closes'; day: string; time: string } | null;
    occupancyEstimate: number;
  },
) {
  const { isOpen, nextChange, todayHours } = data;
  if (isOpen) {
    const closes = nextChange?.event === 'closes' ? nextChange.time : todayHours?.close;
    return closes
      ? t('Open until {time}, about {count} on the floor (estimate)', { time: closes, count: data.occupancyEstimate })
      : t('Open, about {count} on the floor (estimate)', { count: data.occupancyEstimate });
  }
  if (!nextChange) return t('Closed all week');
  if (nextChange.day === 'today') return t('Closed, opens at {time}', { time: nextChange.time });
  if (nextChange.day === 'tomorrow') return t('Closed, opens tomorrow at {time}', { time: nextChange.time });
  const day = (WEEKDAYS as readonly string[]).includes(nextChange.day)
    ? weekdayLabel(nextChange.day as Weekday)
    : nextChange.day;
  return t('Closed, opens {day} at {time}', { day, time: nextChange.time });
}

// Compact ink strip with the sleeve stripes once in its top-right corner, so its right side is padded clear of them.
function HeroShell({ title, tally, children }: { title: ReactNode; tally: ReactNode; children: ReactNode }) {
  const { t } = useI18n();

  return (
    <section
      aria-label={t('Today')}
      className="kit-corner flex flex-col gap-4 overflow-hidden rounded-lg bg-kit py-5 pr-20 pl-5 text-kit-foreground sm:pl-6"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        {title}
        {tally}
      </div>
      <div className="flex flex-col gap-1.5 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">{children}</div>
    </section>
  );
}

function NowHeroSkeleton() {
  return (
    <HeroShell
      title={
        <div className="flex items-end gap-4">
          <Skeleton className="h-18 w-20 bg-white/12" />
          <div className="flex flex-col gap-2 pb-1">
            <Skeleton className="h-9 w-56 bg-white/12 sm:h-10" />
            <Skeleton className="h-6 w-40 bg-white/12" />
          </div>
        </div>
      }
      tally={<Skeleton className="h-12 w-24 bg-white/12" />}
    >
      <Skeleton className="h-5 w-60 bg-white/12" />
      <Skeleton className="h-5 w-72 bg-white/12" />
    </HeroShell>
  );
}

function NowHeroRoot() {
  const i18n = useI18n();
  const { t, tn, formatDate, formatTime } = i18n;
  const trpc = useTRPC();
  const me = useQuery(trpc.auth.me.queryOptions());
  const planQuery = useQuery(trpc.plans.getToday.queryOptions());
  const days = currentWeek();
  const weekQuery = useQuery(trpc.metrics.week.queryOptions({ from: days[0]!.iso, to: days[6]!.iso }));
  const gymQuery = useQuery({ ...trpc.gym.info.queryOptions(), refetchInterval: GYM_REFRESH_MS });

  const now = new Date();
  const firstName = me.data?.user.name.split(' ')[0];
  const lastCheckIn = weekQuery.data?.lastCheckInAt ? new Date(weekQuery.data.lastCheckInAt) : null;
  const isCheckedInToday = lastCheckIn !== null && isSameDay(lastCheckIn, now);

  let tally: ReactNode;
  if (planQuery.isPending) {
    tally = (
      <Deferred>
        <Skeleton className="h-12 w-24 bg-white/12" />
      </Deferred>
    );
  } else if (planQuery.isError) {
    tally = <p className="numerals text-5xl leading-none font-extrabold text-kit-muted">-</p>;
  } else {
    const total = planQuery.data?.exercises.length ?? 0;
    const done = planQuery.data?.exercises.filter((exercise) => exercise.completed).length ?? 0;
    tally = (
      <p className="numerals text-5xl leading-none font-extrabold" aria-live="polite">
        {done}
        <span className="text-kit-muted">/{total}</span>
        <span className="sr-only"> {t('exercises done')}</span>
      </p>
    );
  }

  return (
    <HeroShell
      title={
        <div className="flex items-end gap-4">
          <p className="numerals text-7xl leading-none font-extrabold" aria-hidden>
            {now.getDate()}
          </p>
          <div className="flex min-w-0 flex-col gap-1 pb-1">
            <h1 className="font-display text-3xl leading-none font-extrabold text-balance uppercase sm:text-4xl">
              {firstName ? t("Let's go, {name}", { name: firstName }) : t("Let's go")}
            </h1>
            {/* Built from two parts: Intl orders a bare weekday and month oddly ("outubro terça-feira"). */}
            <p className="text-kit-muted">
              {formatDate(now, { weekday: 'long' })}, {formatDate(now, { month: 'long' })}
            </p>
          </div>
        </div>
      }
      tally={tally}
    >
      <HeroLine
        icon={<LogInIcon className="size-4 shrink-0 text-kit-muted" aria-hidden />}
        isPending={weekQuery.isPending}
        isError={weekQuery.isError}
        failedLabel={t("Couldn't load your check-in")}
        onRetry={() => weekQuery.refetch()}
      >
        {isCheckedInToday && lastCheckIn
          ? tn('Checked in at {time}', {
              time: <span className="numerals text-base font-semibold">{formatTime(lastCheckIn)}</span>,
            })
          : t('Not checked in yet')}
      </HeroLine>
      <HeroLine
        icon={<DoorOpenIcon className="size-4 shrink-0 text-kit-muted" aria-hidden />}
        isPending={gymQuery.isPending}
        isError={gymQuery.isError}
        failedLabel={t("Couldn't load the gym status")}
        onRetry={() => gymQuery.refetch()}
      >
        {gymQuery.data ? describeGym(i18n, gymQuery.data) : null}
      </HeroLine>
    </HeroShell>
  );
}

export const NowHero = Object.assign(NowHeroRoot, { Skeleton: NowHeroSkeleton });
