'use client';

import { useQuery } from '@tanstack/react-query';
import { DoorOpenIcon, LogInIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { currentWeek } from '@/app/(member)/home/current-week';
import { Deferred } from '@/components/deferred';
import { Skeleton } from '@/components/ui/skeleton';
import { isSameDay } from '@/lib/calendar-date';
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
          Retry
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

function describeGym(data: {
  isOpen: boolean;
  todayHours: { open: string; close: string } | null;
  nextChange: { event: 'opens' | 'closes'; day: string; time: string } | null;
  occupancyEstimate: number;
}) {
  const { isOpen, nextChange, todayHours } = data;
  if (isOpen) {
    const closes = nextChange?.event === 'closes' ? nextChange.time : todayHours?.close;
    return `Open${closes ? ` until ${closes}` : ''}, about ${data.occupancyEstimate} on the floor (estimate)`;
  }
  if (!nextChange) return 'Closed all week';
  if (nextChange.day === 'today') return `Closed, opens at ${nextChange.time}`;
  if (nextChange.day === 'tomorrow') return `Closed, opens tomorrow at ${nextChange.time}`;
  return `Closed, opens ${nextChange.day} at ${nextChange.time}`;
}

function clockTime(value: string | Date) {
  return new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

// Compact ink strip with the sleeve stripes once in its top-right corner, so its right side is padded clear of them.
function HeroShell({ title, tally, children }: { title: ReactNode; tally: ReactNode; children: ReactNode }) {
  return (
    <section
      aria-label="Today"
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
        <span className="sr-only"> exercises done</span>
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
              {firstName ? `Let's go, ${firstName}` : "Let's go"}
            </h1>
            <p className="text-kit-muted">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long' })}</p>
          </div>
        </div>
      }
      tally={tally}
    >
      <HeroLine
        icon={<LogInIcon className="size-4 shrink-0 text-kit-muted" aria-hidden />}
        isPending={weekQuery.isPending}
        isError={weekQuery.isError}
        failedLabel="Couldn't load your check-in"
        onRetry={() => weekQuery.refetch()}
      >
        {isCheckedInToday && lastCheckIn ? (
          <>
            Checked in at <span className="numerals text-base font-semibold">{clockTime(lastCheckIn)}</span>
          </>
        ) : (
          'Not checked in yet'
        )}
      </HeroLine>
      <HeroLine
        icon={<DoorOpenIcon className="size-4 shrink-0 text-kit-muted" aria-hidden />}
        isPending={gymQuery.isPending}
        isError={gymQuery.isError}
        failedLabel="Couldn't load the gym status"
        onRetry={() => gymQuery.refetch()}
      >
        {gymQuery.data ? describeGym(gymQuery.data) : null}
      </HeroLine>
    </HeroShell>
  );
}

export const NowHero = Object.assign(NowHeroRoot, { Skeleton: NowHeroSkeleton });
