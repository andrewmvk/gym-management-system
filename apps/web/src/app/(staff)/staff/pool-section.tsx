'use client';

import { heatStep } from '@cadence/shared/schemas/muscle-heat';
import { MUSCLE_IDS, type MuscleId, muscleLabel } from '@cadence/shared/schemas/muscles';
import { useQuery } from '@tanstack/react-query';
import { UsersIcon } from 'lucide-react';
import Link from 'next/link';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { MuscleLegend } from '@/components/muscle-map/muscle-legend';
import { MuscleMap, type MuscleMarks } from '@/components/muscle-map/muscle-map';
import { PanelSection } from '@/components/panel-section';
import { QueryError } from '@/components/query-error';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

const TITLE = "Today's pool";
const DESCRIPTION = "How many of today's plans train each muscle, and which equipment they use.";
const SUMMARY_MUSCLES = 3;
const SKELETON_ROWS = 8;

function PoolSkeleton() {
  return (
    <PanelSection title={TITLE} description={DESCRIPTION}>
      <div className="grid md:grid-cols-2">
        <div className="flex flex-col gap-3 px-5 py-5 sm:px-6">
          <MuscleMap.Skeleton />
          <Skeleton className="h-4 w-64 max-w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="relative border-t md:border-t-0 md:border-l">
          <div className="flex max-h-96 flex-col md:absolute md:inset-0 md:max-h-none">
            <div className="flex shrink-0 flex-col gap-1 border-b px-5 py-4 sm:px-6">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-4 w-52" />
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-5 py-3 sm:px-6">
              {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
                <Skeleton key={index} className="h-9 w-full shrink-0" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </PanelSection>
  );
}

function PoolRoot() {
  const trpc = useTRPC();
  const query = useQuery(trpc.reviews.overview.queryOptions());

  if (query.isPending) {
    return (
      <Deferred>
        <PoolSkeleton />
      </Deferred>
    );
  }

  if (query.isError) {
    return (
      <QueryError
        title="We couldn't load today's pool"
        onRetry={() => query.refetch()}
        isRetrying={query.isRefetching}
      />
    );
  }

  const { planCount, musclePlans, equipment } = query.data;

  if (planCount === 0) {
    return (
      <PanelSection title={TITLE} description={DESCRIPTION}>
        <EmptyState
          icon={UsersIcon}
          title="No plans for today yet"
          description="Plans show up here as members generate them."
        />
      </PanelSection>
    );
  }

  const countOf = (muscle: MuscleId) => musclePlans[muscle] ?? 0;
  const marks: MuscleMarks = Object.fromEntries(
    MUSCLE_IDS.map((muscle) => [muscle, { step: heatStep(countOf(muscle), planCount), isGap: countOf(muscle) === 0 }]),
  );
  const trained = MUSCLE_IDS.filter((muscle) => countOf(muscle) > 0).sort(
    (a, b) => countOf(b) - countOf(a) || MUSCLE_IDS.indexOf(a) - MUSCLE_IDS.indexOf(b),
  );
  const untrained = MUSCLE_IDS.filter((muscle) => countOf(muscle) === 0);
  const downCount = equipment.filter((piece) => !piece.isAvailable).length;

  const summary =
    trained.length > 0
      ? `Most trained: ${trained
          .slice(0, SUMMARY_MUSCLES)
          .map((muscle) => `${muscleLabel(muscle)} (${countOf(muscle)} of ${planCount})`)
          .join(', ')}.${untrained.length > 0 ? ` In no plan: ${untrained.map(muscleLabel).join(', ')}.` : ''}`
      : 'No muscle work in today’s plans yet.';

  return (
    <PanelSection title={TITLE} description={DESCRIPTION}>
      <div className="grid md:grid-cols-2">
        <div className="flex flex-col gap-3 px-5 py-5 sm:px-6">
          <MuscleMap marks={marks} label={`Muscles trained across today's ${planCount} plans`} />
          <MuscleLegend lowLabel="Fewer plans" highLabel="More plans" hasGap gapLabel="No plan trains it" />
          <p className="text-sm text-pretty text-muted-foreground">{summary}</p>
        </div>

        {/* The list takes the height of the body column, so a long equipment list scrolls inside the card. */}
        <div className="relative border-t md:border-t-0 md:border-l">
          <div className="flex max-h-96 flex-col md:absolute md:inset-0 md:max-h-none">
            <div className="flex shrink-0 flex-col gap-0.5 border-b px-5 py-4 sm:px-6">
              <h3 className="font-display text-xl font-bold tracking-wide uppercase">Equipment</h3>
              <p className="text-sm text-muted-foreground">
                Plans today that use each piece.
                {downCount > 0 && (
                  <>
                    {' '}
                    <Link href="/catalog?tab=coverage" className="font-semibold text-foreground underline">
                      {downCount} out of service
                    </Link>
                  </>
                )}
              </p>
            </div>
            <ul aria-label="Equipment use today" className="min-h-0 flex-1 overflow-y-auto">
              {equipment.map((piece) => (
                <li
                  key={piece.id}
                  className="flex items-center justify-between gap-3 border-b px-5 py-2.5 last:border-b-0 sm:px-6"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        'truncate font-semibold',
                        !piece.isAvailable && 'text-muted-foreground line-through',
                      )}
                    >
                      {piece.name}
                    </span>
                    {!piece.isAvailable && <Badge variant="unavailable">Out of service</Badge>}
                  </span>
                  <span className="numerals shrink-0 text-xl leading-none font-bold">
                    {piece.planCount}
                    <span className="text-base text-muted-foreground">/{planCount}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </PanelSection>
  );
}

export const PoolSection = Object.assign(PoolRoot, { Skeleton: PoolSkeleton });
