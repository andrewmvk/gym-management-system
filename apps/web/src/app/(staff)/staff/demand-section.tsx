'use client';

import { useQuery } from '@tanstack/react-query';
import { UsersIcon } from 'lucide-react';
import Link from 'next/link';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { MuscleLoadView } from '@/components/muscle-map/muscle-load-view';
import { PanelSection } from '@/components/panel-section';
import { QueryError } from '@/components/query-error';
import { SegmentedFilter } from '@/components/segmented-filter';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { oneOf, useUrlState } from '@/hooks/use-url-state';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

const TITLE = "Today's demand";
const DESCRIPTION = "What today's plans ask of the gym, so missing or crowded equipment is no surprise.";
const EQUIPMENT_CATALOG_PATH = '/catalog?tab=equipment';
const REFRESH_INTERVAL_MS = 60_000;
const SKELETON_ROWS = 8;

const DEMAND_FILTERS = ['all', 'checked-in'] as const;
type DemandFilter = (typeof DEMAND_FILTERS)[number];

const HEADER_CELL_CLASS =
  'sticky top-0 z-10 bg-card px-3 py-2 font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6';

function plural(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}

function DemandSkeleton() {
  return (
    <PanelSection title={TITLE} description={DESCRIPTION}>
      <div className="border-b px-5 py-3 sm:px-6">
        <Skeleton className="h-5 w-80 max-w-full" />
      </div>
      <div className="grid md:grid-cols-2">
        <div className="flex flex-col gap-4 px-5 py-5 sm:px-6">
          <Skeleton className="h-10 w-full sm:w-80" />
          <MuscleLoadView.Skeleton />
        </div>
        <div className="relative border-t md:border-t-0 md:border-l">
          <div className="flex max-h-96 flex-col md:absolute md:inset-0 md:max-h-none">
            <div className="flex shrink-0 flex-col gap-1 border-b px-5 py-4 sm:px-6">
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-5 w-52 max-w-full" />
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-5 py-3 sm:px-6">
              {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
                <Skeleton key={index} className="h-10 w-full shrink-0" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </PanelSection>
  );
}

function DemandRoot() {
  const trpc = useTRPC();
  const query = useQuery({ ...trpc.reviews.overview.queryOptions(), refetchInterval: REFRESH_INTERVAL_MS });
  const [filter, setFilter] = useUrlState<DemandFilter>('demand', 'all', oneOf(DEMAND_FILTERS));

  if (query.isPending) {
    return (
      <Deferred>
        <DemandSkeleton />
      </Deferred>
    );
  }

  if (!query.data) {
    return (
      <QueryError
        title="We couldn't load today's demand"
        onRetry={() => query.refetch()}
        isRetrying={query.isRefetching}
      />
    );
  }

  const { planCount, checkedInPlanCount, musclePlans, muscleCheckedIn, equipment } = query.data;

  if (planCount === 0) {
    return (
      <PanelSection title={TITLE} description={DESCRIPTION}>
        <EmptyState
          icon={UsersIcon}
          title="No plans dated today yet"
          description="Plans show up here as members build them for today."
        />
      </PanelSection>
    );
  }

  const pieces = [...equipment].sort(
    (a, b) =>
      Number(a.isAvailable) - Number(b.isAvailable) || b.planCount - a.planCount || a.name.localeCompare(b.name),
  );
  const busiest = Math.max(1, ...pieces.map((piece) => piece.planCount));
  const downCount = pieces.filter((piece) => !piece.isAvailable).length;
  const isCheckedInOnly = filter === 'checked-in';

  return (
    <PanelSection title={TITLE} description={DESCRIPTION}>
      <p className="border-b px-5 py-3 text-sm sm:px-6" aria-live="polite">
        <span className="numerals text-base font-bold">{planCount}</span> {plural(planCount, 'plan', 'plans')} dated
        today, <span className="numerals text-base font-bold">{checkedInPlanCount}</span> of them from{' '}
        {plural(checkedInPlanCount, 'a member', 'members')} already in the gym.
      </p>
      <div className="grid md:grid-cols-2">
        <div className="flex flex-col gap-4 px-5 py-5 sm:px-6">
          <SegmentedFilter
            label="Plans to count"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All plans today', count: planCount },
              { value: 'checked-in', label: 'Already checked in', count: checkedInPlanCount },
            ]}
            className="self-start"
          />
          <MuscleLoadView
            load={isCheckedInOnly ? muscleCheckedIn : musclePlans}
            label={isCheckedInOnly ? 'Muscles trained by plans of members already checked in' : 'Muscles trained today'}
            note="Each number is how many plans train that muscle. Exercises that cannot be done now are not counted."
            legend={{ lowLabel: 'Fewer plans', highLabel: 'More plans', gapLabel: 'No plan trains it' }}
            emptyNote={
              isCheckedInOnly ? 'Nobody with a plan today has checked in yet.' : 'No muscle work in today’s plans.'
            }
            includeUntrained
          />
        </div>

        {/* The list takes the height of the muscle column, so a long equipment list scrolls inside the card. */}
        <div className="relative border-t md:border-t-0 md:border-l">
          <div className="flex max-h-96 flex-col md:absolute md:inset-0 md:max-h-none">
            <div className="flex shrink-0 flex-col gap-0.5 border-b px-5 py-4 sm:px-6">
              <h3 className="font-display text-xl font-bold tracking-wide uppercase">Equipment</h3>
              <p className="text-sm text-pretty text-muted-foreground">
                Plans that need each piece, and how many of those members are in the gym.
                {downCount > 0 && (
                  <>
                    {' '}
                    <Link href={EQUIPMENT_CATALOG_PATH} className="font-semibold text-foreground underline">
                      {downCount} out of service
                    </Link>
                    .
                  </>
                )}
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className="w-full" aria-label="Equipment needed by today's plans">
                <thead>
                  <tr className="border-b">
                    <th scope="col" className={cn(HEADER_CELL_CLASS, 'text-left')}>
                      Equipment
                    </th>
                    <th scope="col" className={cn(HEADER_CELL_CLASS, 'w-28 text-right sm:w-40')}>
                      Plans
                    </th>
                    <th scope="col" className={cn(HEADER_CELL_CLASS, 'w-20 text-right sm:w-24')}>
                      In the gym
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pieces.map((piece) => (
                    <tr key={piece.id} className="border-b last:border-b-0">
                      <th
                        scope="row"
                        className="px-3 py-2.5 text-left align-middle font-normal first:pl-5 sm:first:pl-6"
                      >
                        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          {piece.isAvailable ? (
                            <span className="font-semibold">{piece.name}</span>
                          ) : (
                            <>
                              <Link
                                href={EQUIPMENT_CATALOG_PATH}
                                className="font-semibold text-muted-foreground line-through hover:text-foreground"
                              >
                                {piece.name}
                              </Link>
                              <Badge variant="unavailable">Out of service</Badge>
                            </>
                          )}
                        </span>
                      </th>
                      <td className="px-3 py-2.5 align-middle">
                        <div className="flex flex-col items-end gap-1">
                          <span className="numerals text-xl leading-none font-bold">
                            {piece.planCount}
                            <span className="text-base text-muted-foreground"> of {planCount}</span>
                          </span>
                          <span className="h-1 w-full rounded-xs bg-muted" aria-hidden>
                            <span
                              className="block h-full rounded-xs bg-foreground/60"
                              style={{ width: `${(piece.planCount / busiest) * 100}%` }}
                            />
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right align-middle last:pr-5 sm:last:pr-6">
                        <span className="numerals text-xl leading-none font-bold">{piece.checkedInCount}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </PanelSection>
  );
}

export const DemandSection = Object.assign(DemandRoot, { Skeleton: DemandSkeleton });
