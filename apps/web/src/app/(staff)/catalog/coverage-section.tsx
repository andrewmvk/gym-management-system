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
import { DumbbellIcon, XIcon } from 'lucide-react';
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
  { value: 'lost', label: 'Out of service' },
] as const satisfies readonly { value: CoverageMode; label: string }[];

const MODE_NOTE = {
  all: 'Every exercise in the catalog, counted for each muscle it works.',
  available: 'Only exercises that can be done right now.',
} as const satisfies Partial<Record<CoverageMode, string>>;

function PieceChip({
  label,
  count,
  isSelected,
  onClick,
}: {
  label: string;
  count: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onClick}
      className={cn(
        'flex min-h-9 items-center gap-2 rounded-sm border px-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/45',
        isSelected ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-muted/60',
      )}
    >
      {label}
      <span className="numerals text-base">
        {count}
        <span className="sr-only"> {count === 1 ? 'exercise lost' : 'exercises lost'}</span>
      </span>
    </button>
  );
}

const SUMMARY_MUSCLES = 3;

function modeValue(mode: CoverageMode, entry: MuscleCoverage) {
  if (mode === 'all') return entry.total;
  if (mode === 'available') return entry.available;
  return entry.lost;
}

function CoverageSkeleton() {
  return (
    <PanelSection title="Muscle coverage">
      <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
        <Skeleton className="h-11 w-full sm:w-96" />
        <Skeleton className="h-8 w-full sm:w-96" />
        <MuscleMap.Skeleton />
        <Skeleton className="h-4 w-64" />
      </div>
    </PanelSection>
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
  // Narrowing by a piece only exists inside the Out of service view, so leaving it can never leave a piece applied.
  const selectedPiece = mode === 'lost' ? (piecesDown.find((piece) => piece.id === selectedPieceId) ?? null) : null;
  const lostExerciseCount = exercisesQuery.data.filter((exercise) => !exercise.isAvailable).length;
  const changeMode = (next: CoverageMode) => {
    setMode(next);
    setSelectedPieceId(null);
  };
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
      ? `With ${selectedPiece.name} out of service, ${selectedImpact.exerciseIds.length} ${selectedImpact.exerciseIds.length === 1 ? 'exercise is' : 'exercises are'} lost, hitting ${selectedImpact.muscles.map(muscleLabel).join(', ')}.`
      : `${selectedPiece.name} out of service loses nothing, because every exercise that uses it has another option.`;
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
    <div className="min-w-0">
      <div>
        <PanelSection
          title="Muscle coverage"
          description="How well the catalog covers each muscle, and what out-of-service equipment costs."
        >
          <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-3">
              <SegmentedFilter
                label="Coverage view"
                value={mode}
                options={MODE_OPTIONS}
                onChange={changeMode}
                className="w-full sm:w-fit"
              />
              {/* One slot for both: the view's note, or in the Out of service view the pieces to narrow it by. */}
              <div className="flex items-center sm:min-h-9">
                {mode === 'lost' && piecesDown.length > 0 ? (
                  <ul aria-label="Narrow by equipment" className="flex flex-wrap gap-2">
                    <li>
                      <PieceChip
                        label="All pieces"
                        count={lostExerciseCount}
                        isSelected={selectedPiece === null}
                        onClick={() => setSelectedPieceId(null)}
                      />
                    </li>
                    {piecesDown.map((piece) => (
                      <li key={piece.id}>
                        <PieceChip
                          label={piece.name}
                          count={impact.find((entry) => entry.equipmentId === piece.id)?.exerciseIds.length ?? 0}
                          isSelected={piece.id === selectedPiece?.id}
                          onClick={() => setSelectedPieceId(piece.id === selectedPieceId ? null : piece.id)}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {mode === 'lost' ? 'All equipment is in service, so nothing is lost.' : MODE_NOTE[mode]}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:items-stretch">
              <div className="flex flex-col gap-3 md:min-h-112">
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
              {/* The map sets the height; this column fills it and scrolls inside, so a long list never stretches the card. */}
              <div className="relative min-w-0">
                <div className="flex min-w-0 flex-col gap-4 md:absolute md:inset-0 md:overflow-y-auto md:pr-1">
                  <p className="text-sm text-pretty text-muted-foreground" aria-live="polite">
                    {summary}
                  </p>
                  {selectedMuscle && detailCoverage && (
                    <section aria-label={muscleLabel(selectedMuscle)} className="flex flex-col gap-3 border-y py-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-display text-xl font-bold tracking-wide uppercase">
                          {muscleLabel(selectedMuscle)}
                        </h3>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Close ${muscleLabel(selectedMuscle)} details`}
                          onClick={() => setSelectedMuscle(null)}
                        >
                          <XIcon />
                        </Button>
                      </div>
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
                                  {!exercise.isAvailable && <Badge variant="unavailable">Out of service</Badge>}
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
          </div>
        </PanelSection>
      </div>
    </div>
  );
}

export const CoverageSection = Object.assign(CoverageSectionRoot, { Skeleton: CoverageSkeleton });
