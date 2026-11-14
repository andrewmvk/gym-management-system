'use client';

import { type MuscleLoad, rankMuscles } from '@cadence/shared/schemas/muscle-heat';
import { MUSCLE_IDS, type MuscleId } from '@cadence/shared/schemas/muscles';
import { useQuery } from '@tanstack/react-query';
import { UsersIcon } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { DemandChart } from '@/app/(staff)/staff/demand-chart';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { MuscleLegend } from '@/components/muscle-map/muscle-legend';
import { MuscleMap } from '@/components/muscle-map/muscle-map';
import { formatSets, marksFromLoad } from '@/components/muscle-map/muscle-marks';
import { QueryError } from '@/components/query-error';
import { SegmentedFilter } from '@/components/segmented-filter';
import { Skeleton } from '@/components/ui/skeleton';
import { oneOf, useUrlState } from '@/hooks/use-url-state';
import { useI18n } from '@/lib/i18n/i18n-provider';
import { useTRPC } from '@/lib/trpc';

const EQUIPMENT_CATALOG_PATH = '/catalog?tab=equipment';
const REFRESH_INTERVAL_MS = 60_000;
const SKELETON_ROWS = 10;

const DEMAND_FILTERS = ['all', 'checked-in'] as const;
type DemandFilter = (typeof DEMAND_FILTERS)[number];

// The map and the two charts take a third each from lg; below that the map sits above, the charts side by side.
const BOARD_CLASS = 'grid gap-x-8 gap-y-8 md:grid-cols-2 lg:grid-cols-3';

function DemandSkeleton() {
  const { t } = useI18n();
  return (
    <section className="flex flex-col gap-6 border-t pt-8">
      <DemandHeading control={<Skeleton className="h-10 w-full sm:w-96" />} />
      <div className={BOARD_CLASS}>
        <MuscleMap.Skeleton isPaired className="md:col-span-2 lg:col-span-1" />
        <DemandChart.Skeleton title={t('Muscles')} caption={t('Plans per muscle')} rows={SKELETON_ROWS} />
        <DemandChart.Skeleton title={t('plural::Equipment')} caption={t('Plans per piece')} rows={SKELETON_ROWS} />
      </div>
    </section>
  );
}

function DemandHeading({ control }: { control?: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="font-display text-2xl font-bold tracking-wide uppercase">{t("Today's demand")}</h2>
        <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
          {t("What today's plans ask of the gym, so missing or crowded equipment is no surprise.")}
        </p>
      </div>
      {control}
    </div>
  );
}

interface EquipmentDemand {
  id: string;
  name: string;
  isAvailable: boolean;
  planCount: number;
  checkedInCount: number;
}

// The map and the two charts, and the hover they share. The hover lives here and nowhere above, and everything
// the hover does not change is memoized, so pointing at a muscle redraws that muscle on the map, recolors one bar
// and nothing else: the equipment chart, the other muscles and the page around them stay as they are.
function DemandBoard({
  load,
  equipment,
  isCheckedInOnly,
}: {
  load: MuscleLoad;
  equipment: readonly EquipmentDemand[];
  isCheckedInOnly: boolean;
}) {
  const { t, tn, tx, locale, muscleLabel } = useI18n();
  const [hovered, setHovered] = useState<MuscleId | null>(null);
  const [selected, setSelected] = useState<MuscleId | null>(null);
  const formatValue = useCallback((value: number) => formatSets(locale, value), [locale]);

  const muscleData = useMemo(
    () =>
      [
        ...rankMuscles(load),
        ...MUSCLE_IDS.filter((muscle) => !load[muscle]).map((muscle) => ({ muscle, load: 0 })),
      ].map(({ muscle, load: value }) => ({ key: muscle, name: muscleLabel(muscle), value })),
    [load, muscleLabel],
  );

  const marks = useMemo(() => {
    const result = marksFromLoad(load);
    for (const muscle of MUSCLE_IDS) {
      const mark = result[muscle];
      if (!mark) continue;
      const planCount = load[muscle] ?? 0;
      mark.value = planCount === 1 ? t('1 plan') : t('{count} plans', { count: formatSets(locale, planCount) });
      if (!load[muscle]) mark.isGap = true;
    }
    return result;
  }, [load, locale, t]);

  const equipmentData = useMemo(() => {
    const countOf = (piece: EquipmentDemand) => (isCheckedInOnly ? piece.checkedInCount : piece.planCount);
    return [...equipment]
      .sort(
        (a, b) =>
          countOf(b) - countOf(a) || Number(a.isAvailable) - Number(b.isAvailable) || a.name.localeCompare(b.name),
      )
      .map((piece) => ({
        key: piece.id,
        name: tx(piece.name),
        value: countOf(piece),
        isOutOfService: !piece.isAvailable,
      }));
  }, [equipment, isCheckedInOnly, tx]);
  const downCount = equipmentData.filter((piece) => piece.isOutOfService).length;

  const hoverMuscle = useCallback((key: string | null) => setHovered(key as MuscleId | null), []);
  const toggleSelected = useCallback(
    (muscle: string) => setSelected((current) => (current === muscle ? null : (muscle as MuscleId))),
    [],
  );

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: it only drops a hover the pointer has already left; every control inside is a real one. */}
      <div className={BOARD_CLASS} onMouseLeave={() => setHovered(null)}>
        <div className="flex flex-col h-full justify-end gap-3 md:col-span-2 lg:col-span-1">
          <MuscleMap
            isPaired
            hasTooltip
            marks={marks}
            label={
              isCheckedInOnly ? t('Muscles trained by plans of members already checked in') : t('Muscles trained today')
            }
            selected={selected}
            highlighted={hovered}
            onSelect={toggleSelected}
            onHover={setHovered}
          />
          <MuscleLegend
            lowLabel={t('Fewer plans')}
            highLabel={t('More plans')}
            hasGap
            gapLabel={t('No plan trains it')}
            className="justify-center lg:justify-start"
          />
        </div>

        <DemandChart
          title={t('Muscles')}
          caption={t('Plans per muscle')}
          data={muscleData}
          formatValue={formatValue}
          activeKey={hovered ?? selected}
          selectedKey={selected}
          onHover={hoverMuscle}
          onSelect={toggleSelected}
        />

        <DemandChart
          title={t('plural::Equipment')}
          caption={t('Plans per piece')}
          data={equipmentData}
          formatValue={String}
        />
      </div>

      <p className="max-w-prose text-xs text-pretty text-muted-foreground">
        {t(
          'Each number is how many plans train that muscle or need that piece of equipment. Exercises that cannot be done now are not counted.',
        )}
        {downCount > 0 && (
          <>
            {' '}
            {tn('{link} (struck through).', {
              link: (
                <Link href={EQUIPMENT_CATALOG_PATH} className="font-semibold text-foreground underline">
                  {t('{count} out of service', { count: downCount })}
                </Link>
              ),
            })}
          </>
        )}
      </p>
    </>
  );
}

function DemandRoot() {
  const { t } = useI18n();
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
        title={t("We couldn't load today's demand")}
        onRetry={() => query.refetch()}
        isRetrying={query.isRefetching}
      />
    );
  }

  const { planCount, checkedInPlanCount, musclePlans, muscleCheckedIn, equipment } = query.data;

  if (planCount === 0) {
    return (
      <section className="flex flex-col gap-2 border-t pt-8">
        <DemandHeading />
        <EmptyState
          icon={UsersIcon}
          title={t('No plans dated today yet')}
          description={t('Plans show up here as members build them for today.')}
        />
      </section>
    );
  }

  const isCheckedInOnly = filter === 'checked-in';

  return (
    <section className="flex flex-col gap-6 border-t pt-8">
      <DemandHeading
        control={
          <SegmentedFilter
            label={t('Plans to count')}
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: t('All plans today'), count: planCount },
              { value: 'checked-in', label: t('Already checked in'), count: checkedInPlanCount },
            ]}
            className="w-full sm:w-auto"
          />
        }
      />

      {isCheckedInOnly && checkedInPlanCount === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={t('Nobody with a plan has checked in yet')}
          description={t('The plans of members who are in the gym show up here once they check in.')}
        />
      ) : (
        <DemandBoard
          load={isCheckedInOnly ? muscleCheckedIn : musclePlans}
          equipment={equipment}
          isCheckedInOnly={isCheckedInOnly}
        />
      )}
    </section>
  );
}

export const DemandSection = Object.assign(DemandRoot, { Skeleton: DemandSkeleton });
