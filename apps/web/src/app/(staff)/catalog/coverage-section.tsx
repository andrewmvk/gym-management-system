'use client';

import {
  computeEquipmentImpact,
  computeMuscleCoverage,
  heatStep,
  type MuscleCoverage,
  peakLoad,
} from '@cadence/shared/schemas/muscle-heat';
import { MUSCLE_IDS, type MuscleId, muscleLabel } from '@cadence/shared/schemas/muscles';
import { useQuery } from '@tanstack/react-query';
import { DumbbellIcon, WrenchIcon, XIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { MuscleLegend } from '@/components/muscle-map/muscle-legend';
import { MuscleMap, type MuscleMarks } from '@/components/muscle-map/muscle-map';
import { type MuscleRankItem, MuscleRankList } from '@/components/muscle-map/muscle-rank-list';
import { PanelSection } from '@/components/panel-section';
import { QueryError } from '@/components/query-error';
import { SegmentedFilter } from '@/components/segmented-filter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { oneOf, useUrlState } from '@/hooks/use-url-state';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

const COVERAGE_MODES = ['all', 'available', 'lost'] as const;
type CoverageMode = (typeof COVERAGE_MODES)[number];

const MODE_OPTIONS = [
  { value: 'all', label: 'Catalog' },
  { value: 'available', label: 'Available now' },
  { value: 'lost', label: 'Lost' },
] as const satisfies readonly { value: CoverageMode; label: string }[];

const MODE_NOTE: Record<CoverageMode, string> = {
  all: 'Every exercise in the catalog, counted for each muscle it works.',
  available: 'Only exercises that can be done right now.',
  lost: 'What the equipment that is out of service takes away.',
};

const SUMMARY_MUSCLES = 3;

function modeValue(mode: CoverageMode, entry: MuscleCoverage) {
  if (mode === 'all') return entry.total;
  if (mode === 'available') return entry.available;
  return entry.lost;
}

function CoverageSkeleton() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-3">
      <div className="min-w-0 lg:col-span-2">
        <PanelSection title="Muscle coverage">
          <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
            <Skeleton className="h-11 w-full sm:w-96" />
            <MuscleMap.Skeleton />
            <Skeleton className="h-4 w-64" />
          </div>
        </PanelSection>
      </div>
      <PanelSection title="Out of service">
        <div className="flex flex-col gap-3 px-5 py-4 sm:px-6">
          {Array.from({ length: 3 }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </PanelSection>
    </div>
  );
}

function CoverageSectionRoot() {
  const trpc = useTRPC();
  const exercisesQuery = useQuery(trpc.catalog.list.queryOptions());
  const equipmentQuery = useQuery(trpc.catalog.listEquipment.queryOptions());
  const [mode, setMode] = useUrlState<CoverageMode>('view', 'all', oneOf(COVERAGE_MODES));
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleId | null>(null);
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleId | null>(null);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);

  const exercises = exercisesQuery.data;
  const coverage = useMemo(() => computeMuscleCoverage(exercises ?? []), [exercises]);
  const impact = useMemo(() => computeEquipmentImpact(exercises ?? []), [exercises]);

  if (exercisesQuery.isPending || equipmentQuery.isPending) {
    return (
      <Deferred>
        <CoverageSkeleton />
      </Deferred>
    );
  }

  if (exercisesQuery.isError || equipmentQuery.isError) {
    return (
      <QueryError
        title="We couldn't load the coverage"
        onRetry={() => {
          exercisesQuery.refetch();
          equipmentQuery.refetch();
        }}
        isRetrying={exercisesQuery.isRefetching || equipmentQuery.isRefetching}
      />
    );
  }

  if (exercisesQuery.data.length === 0) {
    return (
      <div className="rounded-lg border bg-card">
        <EmptyState
          icon={DumbbellIcon}
          title="No exercises yet"
          description="Coverage shows up once exercises are added with their muscles."
        />
      </div>
    );
  }

  const piecesDown = equipmentQuery.data.filter((piece) => !piece.isAvailable);
  const selectedPiece = piecesDown.find((piece) => piece.id === selectedPieceId) ?? null;
  const selectedImpact = impact.find((entry) => entry.equipmentId === selectedPiece?.id) ?? null;
  const lostByPiece = exercisesQuery.data.filter((exercise) => selectedImpact?.exerciseIds.includes(exercise.id));

  // A selected piece of equipment takes over the map: only the muscles it hurts are drawn, hatched.
  const pieceLoad = selectedPiece
    ? Object.fromEntries(
        MUSCLE_IDS.map((muscle) => [
          muscle,
          lostByPiece.filter((exercise) => exercise.muscles.some((entry) => entry.muscle === muscle)).length,
        ]),
      )
    : null;

  const peak = pieceLoad ? peakLoad(pieceLoad) : Math.max(0, ...coverage.map((entry) => modeValue(mode, entry)));

  const marks: MuscleMarks = Object.fromEntries(
    coverage.map((entry) => {
      if (pieceLoad) {
        const value = pieceLoad[entry.muscle] ?? 0;
        return [entry.muscle, { step: heatStep(value, peak), isLost: value > 0 }];
      }
      const value = modeValue(mode, entry);
      return [
        entry.muscle,
        {
          step: heatStep(value, peak),
          isLost: mode === 'lost' && entry.lost > 0,
          isGap: mode !== 'lost' && (mode === 'all' ? entry.total === 0 : entry.available === 0),
        },
      ];
    }),
  );

  const coverageOf = (muscle: MuscleId) => coverage.find((entry) => entry.muscle === muscle)!;

  const items: MuscleRankItem[] = coverage
    .filter((entry) => {
      if (pieceLoad) return (pieceLoad[entry.muscle] ?? 0) > 0;
      return mode === 'lost' ? entry.lost > 0 : true;
    })
    .sort((a, b) => {
      if (pieceLoad) return (pieceLoad[b.muscle] ?? 0) - (pieceLoad[a.muscle] ?? 0);
      return modeValue(mode, b) - modeValue(mode, a) || MUSCLE_IDS.indexOf(a.muscle) - MUSCLE_IDS.indexOf(b.muscle);
    })
    .map((entry) => {
      const mark = marks[entry.muscle]!;
      return {
        muscle: entry.muscle,
        step: mark.step,
        isLost: mark.isLost,
        isGap: mark.isGap,
        value: pieceLoad
          ? String(pieceLoad[entry.muscle] ?? 0)
          : mode === 'lost'
            ? String(entry.lost)
            : `${entry.available}/${entry.total}`,
      };
    });

  const gaps = coverage.filter((entry) => (mode === 'available' ? entry.available === 0 : entry.total === 0));
  const best = [...coverage]
    .sort((a, b) => modeValue(mode, b) - modeValue(mode, a))
    .filter((entry) => modeValue(mode, entry) > 0)
    .slice(0, SUMMARY_MUSCLES);
  let summary: string;
  if (selectedPiece) {
    summary = selectedImpact
      ? `${selectedPiece.name} being down takes out ${selectedImpact.exerciseIds.length} ${selectedImpact.exerciseIds.length === 1 ? 'exercise' : 'exercises'}, hitting ${selectedImpact.muscles.map(muscleLabel).join(', ')}.`
      : `${selectedPiece.name} is down, but every exercise that uses it has another option.`;
  } else if (mode === 'lost') {
    summary =
      items.length > 0
        ? `Most affected: ${items
            .slice(0, SUMMARY_MUSCLES)
            .map((item) => muscleLabel(item.muscle))
            .join(', ')}.`
        : 'Nothing is lost. Every exercise can be done.';
  } else {
    const bestText =
      best.length > 0 ? `Best covered: ${best.map((entry) => muscleLabel(entry.muscle)).join(', ')}. ` : '';
    const gapText =
      gaps.length > 0
        ? `${gaps.length} with no ${mode === 'available' ? 'available ' : ''}exercise: ${gaps.map((entry) => muscleLabel(entry.muscle)).join(', ')}.`
        : 'Every muscle has an exercise.';
    summary = `${bestText}${gapText}`;
  }

  const detailCoverage = selectedMuscle ? coverageOf(selectedMuscle) : null;
  const detailExercises = selectedMuscle
    ? exercisesQuery.data
        .flatMap((exercise) => {
          const entry = exercise.muscles.find((candidate) => candidate.muscle === selectedMuscle);
          return entry ? [{ exercise, role: entry.role }] : [];
        })
        .sort((a, b) =>
          a.role === b.role ? a.exercise.name.localeCompare(b.exercise.name) : a.role === 'primary' ? -1 : 1,
        )
    : [];
  const detailEquipment = [
    ...new Map(
      detailExercises.flatMap(({ exercise }) => exercise.equipment).map((piece) => [piece.id, piece]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const toggleMuscle = (muscle: MuscleId) => setSelectedMuscle((current) => (current === muscle ? null : muscle));

  return (
    <div className="grid items-start gap-6 lg:grid-cols-3">
      <div className="min-w-0 lg:col-span-2">
        <PanelSection
          title="Muscle coverage"
          description="How well the catalog covers each muscle, and what broken equipment costs."
        >
          <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
            {selectedPiece ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold">
                  Showing what <span className="underline decoration-1">{selectedPiece.name}</span> takes out
                </p>
                <Button variant="outline" size="sm" onClick={() => setSelectedPieceId(null)}>
                  <XIcon data-icon="inline-start" />
                  Show all
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <SegmentedFilter
                  label="Coverage view"
                  value={mode}
                  options={MODE_OPTIONS}
                  onChange={setMode}
                  className="w-full sm:w-fit"
                />
                <p className="text-sm text-muted-foreground">{MODE_NOTE[mode]}</p>
              </div>
            )}

            <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:items-start">
              <div className="flex flex-col gap-3">
                <MuscleMap
                  marks={marks}
                  label="Muscle coverage of the catalog"
                  selected={selectedMuscle}
                  highlighted={hoveredMuscle}
                  onSelect={toggleMuscle}
                  onHover={setHoveredMuscle}
                />
                <MuscleLegend
                  lowLabel={mode === 'lost' || selectedPiece ? 'Less lost' : 'Fewer exercises'}
                  highLabel={mode === 'lost' || selectedPiece ? 'More lost' : 'More exercises'}
                  hasLost={mode === 'lost' || Boolean(selectedPiece)}
                  hasGap={!selectedPiece && mode !== 'lost'}
                  gapLabel={mode === 'available' ? 'No exercise available now' : 'No exercise trains it'}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-4">
                <p className="text-sm text-pretty text-muted-foreground" aria-live="polite">
                  {summary}
                </p>
                {selectedMuscle && detailCoverage && (
                  <section aria-label={muscleLabel(selectedMuscle)} className="flex flex-col gap-3 border-y py-4">
                    <h3 className="font-display text-xl font-bold tracking-wide uppercase">
                      {muscleLabel(selectedMuscle)}
                    </h3>
                    {detailExercises.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No exercise trains this muscle yet.</p>
                    ) : (
                      <>
                        <p className="text-sm text-muted-foreground">
                          <span className="numerals text-base font-bold text-foreground">
                            {detailCoverage.available}/{detailCoverage.total}
                          </span>{' '}
                          exercises available.
                        </p>
                        <ul className="flex flex-col gap-1.5">
                          {detailExercises.map(({ exercise, role }) => (
                            <li key={exercise.id} className="flex items-center justify-between gap-3 text-sm">
                              <span
                                className={cn(
                                  'font-semibold',
                                  !exercise.isAvailable && 'text-muted-foreground line-through',
                                )}
                              >
                                {exercise.name}
                              </span>
                              <span className="flex shrink-0 items-center gap-2">
                                <Badge variant={role === 'primary' ? 'default' : 'outline'}>{role}</Badge>
                                <Badge variant={exercise.isAvailable ? 'live' : 'unavailable'}>
                                  {exercise.isAvailable ? 'Available' : 'Unavailable'}
                                </Badge>
                              </span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-sm">
                          <span className="font-semibold">Equipment: </span>
                          {detailEquipment.length === 0
                            ? 'bodyweight only'
                            : detailEquipment.map((piece, index) => (
                                <span
                                  key={piece.id}
                                  className={cn(!piece.isAvailable && 'text-muted-foreground line-through')}
                                >
                                  {index > 0 && ', '}
                                  {piece.name}
                                </span>
                              ))}
                        </p>
                      </>
                    )}
                  </section>
                )}
                {items.length > 0 && (
                  <MuscleRankList
                    label="Muscle coverage, ranked"
                    items={items}
                    selected={selectedMuscle}
                    onSelect={toggleMuscle}
                    onHover={setHoveredMuscle}
                  />
                )}
              </div>
            </div>
          </div>
        </PanelSection>
      </div>

      <PanelSection title="Out of service" description="Pick a piece to see which muscles lose exercises.">
        {piecesDown.length === 0 ? (
          <EmptyState icon={WrenchIcon} title="All running" description="No equipment is switched off right now." />
        ) : (
          <ul>
            {piecesDown.map((piece) => {
              const pieceImpact = impact.find((entry) => entry.equipmentId === piece.id);
              const isSelected = piece.id === selectedPieceId;
              return (
                <li key={piece.id} className="border-b last:border-b-0">
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedPieceId(isSelected ? null : piece.id)}
                    className={cn(
                      'flex min-h-15 w-full items-center justify-between gap-4 px-5 py-3 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/45 sm:px-6',
                      isSelected && 'bg-accent/60',
                    )}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="font-semibold">{piece.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {pieceImpact
                          ? pieceImpact.muscles.map(muscleLabel).join(', ')
                          : 'Every exercise has another option'}
                      </span>
                    </span>
                    <span className="numerals shrink-0 text-3xl leading-none font-bold">
                      {pieceImpact?.exerciseIds.length ?? 0}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PanelSection>
    </div>
  );
}

export const CoverageSection = Object.assign(CoverageSectionRoot, { Skeleton: CoverageSkeleton });
