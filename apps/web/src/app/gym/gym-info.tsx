'use client';

import { createAppAbility } from '@cadence/shared/auth';
import { useQuery } from '@tanstack/react-query';
import { DoorClosedIcon, DoorOpenIcon, FlameIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { MuscleLoadView } from '@/components/muscle-map/muscle-load-view';
import { PanelSection } from '@/components/panel-section';
import { QueryError } from '@/components/query-error';
import { Badge } from '@/components/ui/badge';
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

const REFRESH_INTERVAL_MS = 60_000;
const HOUR_LABEL_EVERY = 6;
// A lone check-in should read as small, not as a full bar.
const MIN_BAR_SCALE = 5;
const SKELETON_ROWS = ['a', 'b', 'c', 'd'];
const BAR_FILL = 'color-mix(in oklch, var(--foreground) 60%, transparent)';
const HOURLY_CHART_CONFIG = { count: { label: 'Check-ins', color: 'var(--primary)' } } satisfies ChartConfig;

interface DemandEntry {
  name: string;
  count: number;
}

interface NextChange {
  event: 'opens' | 'closes';
  day: string;
  time: string;
}

function plural(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}

function pad(hour: number) {
  return String(hour).padStart(2, '0');
}

function capitalize(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function describeNextChange(change: NextChange | null) {
  if (!change) return 'Closed all week';
  if (change.event === 'closes') return `Open until ${change.time}`;
  if (change.day === 'today') return `Opens at ${change.time}`;
  if (change.day === 'tomorrow') return `Opens tomorrow at ${change.time}`;
  return `Opens ${capitalize(change.day)} at ${change.time}`;
}

function DemandBars({ entries }: { entries: DemandEntry[] }) {
  const scale = Math.max(MIN_BAR_SCALE, ...entries.map((entry) => entry.count));
  return (
    <ul className="flex flex-col gap-3 px-5 py-4 sm:px-6">
      {entries.map((entry) => (
        <li key={entry.name} className="flex items-center gap-3">
          <span className="w-32 shrink-0 text-sm font-medium wrap-break-word sm:w-48">{entry.name}</span>
          <span className="h-3 flex-1 rounded-xs bg-muted" aria-hidden>
            <span className="block h-full rounded-xs bg-primary" style={{ width: `${(entry.count / scale) * 100}%` }} />
          </span>
          <span className="numerals min-w-8 text-right font-display text-lg leading-none font-bold">{entry.count}</span>
        </li>
      ))}
    </ul>
  );
}

function HourlyCheckIns({ hours, currentHour }: { hours: { hour: number; count: number }[]; currentHour: number }) {
  const max = Math.max(...hours.map((entry) => entry.count));
  const total = hours.reduce((sum, entry) => sum + entry.count, 0);
  const peak = hours.find((entry) => entry.count === max)!;

  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:px-6">
      <p className="text-sm">
        Peak <span className="numerals font-semibold">{pad(peak.hour)}:00</span> with {peak.count}{' '}
        {plural(peak.count, 'check-in', 'check-ins')}. {total} {plural(total, 'check-in', 'check-ins')} so far today.
      </p>
      <ChartContainer config={HOURLY_CHART_CONFIG} className="aspect-auto h-48 w-full">
        <BarChart accessibilityLayer data={hours} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="hour"
            interval={0}
            tickLine={false}
            axisLine={false}
            tickFormatter={(hour: number) => (hour % HOUR_LABEL_EVERY === 0 ? pad(hour) : '')}
          />
          <YAxis allowDecimals={false} width={28} tickLine={false} axisLine={false} />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideIndicator
                labelFormatter={(_, payload) => {
                  const hour = payload[0]?.payload.hour as number;
                  return `${pad(hour)}:00 to ${pad(hour)}:59`;
                }}
              />
            }
          />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {hours.map(({ hour }) => (
              <Cell key={hour} fill={hour === currentHour ? 'var(--primary)' : BAR_FILL} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}

function StatusPanel({
  isOpen,
  todayHours,
  nextChange,
  occupancy,
  windowMinutes,
}: {
  isOpen: boolean;
  todayHours: { open: string; close: string } | null;
  nextChange: NextChange | null;
  occupancy: number;
  windowMinutes: number;
}) {
  const StatusIcon = isOpen ? DoorOpenIcon : DoorClosedIcon;
  return (
    <div className="grid overflow-hidden rounded-lg bg-kit text-kit-foreground md:grid-cols-2">
      <div className="flex flex-col gap-3 border-b border-kit-line px-5 py-6 sm:px-6 md:border-r md:border-b-0">
        <p className="font-display text-xs font-semibold tracking-widest text-kit-muted uppercase">The gym is</p>
        <p className="flex items-center gap-3">
          <StatusIcon className="size-10" aria-hidden />
          <span className="font-display text-6xl leading-none font-extrabold uppercase">
            {isOpen ? 'Open' : 'Closed'}
          </span>
        </p>
        <div className="flex flex-col gap-0.5 text-sm">
          <p className="numerals font-display text-xl leading-tight font-semibold">{describeNextChange(nextChange)}</p>
          <p className="text-kit-muted">
            {todayHours ? `Today's hours ${todayHours.open} to ${todayHours.close}` : 'Closed all day today'}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 px-5 py-6 sm:px-6">
        <div className="flex items-center gap-2">
          <p className="font-display text-xs font-semibold tracking-widest text-kit-muted uppercase">On the floor</p>
          <Badge variant="pending" className="border-kit-muted text-kit-foreground">
            Estimate
          </Badge>
        </div>
        <p className={cn('flex items-baseline gap-2', !isOpen && 'text-kit-muted')}>
          <span className="font-display text-xl font-semibold uppercase">About</span>
          <span className="numerals font-display text-6xl leading-none font-extrabold">{occupancy}</span>
          <span className="font-display text-xl font-semibold uppercase">{plural(occupancy, 'person', 'people')}</span>
        </p>
        <p className="text-sm text-pretty text-kit-muted">
          Check-ins in the last {windowMinutes} minutes. The gym has no checkout, so this is an estimate, not a
          headcount.
        </p>
      </div>
    </div>
  );
}

function StatusPanelSkeleton() {
  return (
    <div className="grid overflow-hidden rounded-lg bg-kit md:grid-cols-2">
      <div className="flex flex-col gap-3 border-b border-kit-line px-5 py-6 sm:px-6 md:border-r md:border-b-0">
        <Skeleton className="h-4 w-20 bg-kit-line" />
        <Skeleton className="h-15 w-52 bg-kit-line" />
        <Skeleton className="h-7 w-44 bg-kit-line" />
        <Skeleton className="h-5 w-52 bg-kit-line" />
      </div>
      <div className="flex flex-col gap-3 px-5 py-6 sm:px-6">
        <Skeleton className="h-4 w-36 bg-kit-line" />
        <Skeleton className="h-15 w-64 bg-kit-line" />
        <Skeleton className="h-10 w-full bg-kit-line" />
      </div>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-col gap-1 border-b px-5 py-4 sm:px-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>
      <div className="flex flex-col gap-3 px-5 py-4 sm:px-6">
        {SKELETON_ROWS.map((row) => (
          <Skeleton key={row} className="h-6 w-full" />
        ))}
      </div>
    </div>
  );
}

function HourlySkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex flex-col gap-1 border-b px-5 py-4 sm:px-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>
      <div className="flex flex-col gap-3 px-5 py-4 sm:px-6">
        <Skeleton className="h-5 w-80 max-w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}

function GymInfoSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <StatusPanelSkeleton />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="flex flex-col gap-1 border-b px-5 py-4 sm:px-6">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-64" />
          </div>
          <MuscleLoadView.Skeleton className="px-5 py-5 sm:px-6" />
        </div>
        <SectionSkeleton />
      </div>
    </div>
  );
}

export function GymInfo() {
  const trpc = useTRPC();
  const me = useQuery(trpc.auth.me.queryOptions());
  const rules = me.data?.rules;
  const canSeeHourly = useMemo(() => createAppAbility(rules).can('read', 'CheckIn'), [rules]);

  const info = useQuery({ ...trpc.gym.info.queryOptions(), refetchInterval: REFRESH_INTERVAL_MS });
  const detail = useQuery({
    ...trpc.gym.adminDetail.queryOptions(),
    enabled: canSeeHourly,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  const data = detail.data ?? info.data;

  if (!data) {
    if (info.isError) {
      return <QueryError title="Gym info unavailable" onRetry={() => info.refetch()} isRetrying={info.isFetching} />;
    }
    return (
      <Deferred>
        <GymInfoSkeleton />
      </Deferred>
    );
  }

  const updatedAt = new Date(detail.data ? detail.dataUpdatedAt : info.dataUpdatedAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const isStale = info.isError;
  const hasDemand = Object.keys(data.demand.muscleLoad).length > 0 || data.demand.equipment.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          Updated <span className="numerals font-semibold text-foreground">{updatedAt}</span>
          {isStale && <Badge variant="retry">Couldn't refresh</Badge>}
        </p>
        <StatusPanel
          isOpen={data.isOpen}
          todayHours={data.todayHours}
          nextChange={data.nextChange}
          occupancy={data.occupancyEstimate}
          windowMinutes={data.occupancyWindowMinutes}
        />
      </div>
      {hasDemand ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <PanelSection
            title="Muscles in demand"
            description="Sets planned today by members who have checked in. Out-of-service equipment is left out."
          >
            <MuscleLoadView
              load={data.demand.muscleLoad}
              label="Muscles in demand today"
              emptyNote="No muscle work planned yet."
              className="px-5 py-5 sm:px-6"
            />
          </PanelSection>
          <PanelSection
            title="Equipment in demand"
            description="Equipment those exercises use. Out-of-service equipment is left out."
          >
            <DemandBars entries={data.demand.equipment} />
          </PanelSection>
        </div>
      ) : (
        <PanelSection title="In demand today">
          <EmptyState
            icon={FlameIcon}
            title="No demand yet"
            description="Nobody has checked in with a plan today. Muscles and equipment show up here as members arrive."
          />
        </PanelSection>
      )}
      {canSeeHourly && detail.isPending && (
        <Deferred>
          <HourlySkeleton />
        </Deferred>
      )}
      {canSeeHourly && detail.isError && (
        <QueryError title="Hourly detail unavailable" onRetry={() => detail.refetch()} isRetrying={detail.isFetching} />
      )}
      {detail.data && (
        <PanelSection
          title="Check-ins per hour"
          description="Today, by hour of the day. Hover or tap a bar for its count."
        >
          {detail.data.checkInsPerHour.every((entry) => entry.count === 0) ? (
            <EmptyState icon={FlameIcon} title="No check-ins yet today" />
          ) : (
            <HourlyCheckIns hours={detail.data.checkInsPerHour} currentHour={detail.data.currentHour} />
          )}
        </PanelSection>
      )}
    </div>
  );
}

GymInfo.Skeleton = GymInfoSkeleton;
