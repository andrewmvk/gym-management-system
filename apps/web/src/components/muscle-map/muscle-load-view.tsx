'use client';

import { heatStep, type MuscleLoad, peakLoad, rankMuscles } from '@cadence/shared/schemas/muscle-heat';
import { MUSCLE_IDS, type MuscleId, muscleLabel } from '@cadence/shared/schemas/muscles';
import { type ReactNode, useState } from 'react';
import { MuscleLegend } from '@/components/muscle-map/muscle-legend';
import { MuscleMap } from '@/components/muscle-map/muscle-map';
import { formatSets, type MuscleFocusMap, marksFromLoad } from '@/components/muscle-map/muscle-marks';
import { MuscleRankList } from '@/components/muscle-map/muscle-rank-list';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const SUMMARY_MUSCLES = 3;

interface MuscleLoadViewProps {
  load: MuscleLoad;
  label: string;
  focus?: MuscleFocusMap;
  detail?: (muscle: MuscleId) => ReactNode;
  includeUntrained?: boolean;
  isSplit?: boolean;
  // For a narrow column: one body at a time behind the Front/Back toggle at every width.
  isSingleView?: boolean;
  emptyNote?: string;
  // Says what the numbers count when it is not weighted sets. `null` hides the line.
  note?: string | null;
  // Labels the ramp ends and, when it has a gap label, outlines the muscles with no work in dashes.
  legend?: { lowLabel: string; highLabel: string; gapLabel?: string };
  selected?: MuscleId | null;
  onSelectedChange?: (muscle: MuscleId | null) => void;
  // Injuries the member reported: the muscle and what they said, drawn on the body and flagged in the list.
  injured?: ReadonlyMap<MuscleId, string>;
  className?: string;
}

// A heat map of weighted sets with its ranked list beside it. The list is the text summary and the
// keyboard path; the body is for looking and tapping. Selection is local unless the parent passes it in.
function MuscleLoadViewRoot({
  load,
  label,
  focus,
  detail,
  includeUntrained,
  isSplit,
  isSingleView,
  emptyNote = 'No muscle work to show yet.',
  note = 'Counted in weighted sets. A supporting muscle counts half.',
  legend,
  selected: controlledSelected,
  onSelectedChange,
  injured,
  className,
}: MuscleLoadViewProps) {
  const [localSelected, setLocalSelected] = useState<MuscleId | null>(null);
  const [hovered, setHovered] = useState<MuscleId | null>(null);
  const selected = controlledSelected === undefined ? localSelected : controlledSelected;
  const setSelected = onSelectedChange ?? setLocalSelected;

  const ranked = rankMuscles(load);
  const peak = peakLoad(load);
  const toggle = (muscle: MuscleId) => setSelected(selected === muscle ? null : muscle);

  const trainedItems = ranked.map(({ muscle, load: value }) => ({
    muscle,
    step: heatStep(value, peak),
    value: formatSets(value),
    bias: focus?.[muscle],
    isInjured: injured?.has(muscle),
  }));
  const untrainedItems = MUSCLE_IDS.filter((muscle) => !load[muscle]).map((muscle) => ({
    muscle,
    step: 0,
    value: '0',
    bias: focus?.[muscle],
    isInjured: injured?.has(muscle),
  }));

  const marks = marksFromLoad(load, focus);
  for (const muscle of injured?.keys() ?? []) {
    const mark = marks[muscle];
    if (mark) mark.isInjured = true;
  }
  if (legend?.gapLabel) {
    for (const muscle of MUSCLE_IDS) {
      const mark = marks[muscle];
      if (mark && !load[muscle]) mark.isGap = true;
    }
  }

  const summary =
    ranked.length > 0
      ? `Most work: ${ranked
          .slice(0, SUMMARY_MUSCLES)
          .map((entry) => muscleLabel(entry.muscle))
          .join(', ')}.`
      : emptyNote;

  return (
    <div className={cn('flex flex-col gap-5', isSplit && 'md:grid md:grid-cols-2 md:items-start', className)}>
      <div className="flex flex-col gap-3">
        <MuscleMap
          isSingleView={isSingleView}
          marks={marks}
          label={label}
          selected={selected}
          highlighted={hovered}
          onSelect={toggle}
          onHover={setHovered}
        />
        <MuscleLegend
          lowLabel={legend?.lowLabel}
          highLabel={legend?.highLabel}
          hasGap={Boolean(legend?.gapLabel)}
          hasInjury={Boolean(injured?.size)}
          gapLabel={legend?.gapLabel}
        />
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <p className="text-sm text-pretty text-muted-foreground" aria-live="polite">
          {summary}
        </p>
        {selected && detail?.(selected)}
        {trainedItems.length > 0 && (
          <MuscleRankList
            label={`${label}, ranked`}
            items={trainedItems}
            selected={selected}
            onSelect={toggle}
            onHover={setHovered}
          />
        )}
        {includeUntrained && (
          <details className="group">
            <summary className="flex min-h-11 items-center font-display text-sm font-semibold tracking-widest text-muted-foreground uppercase outline-none focus-visible:ring-3 focus-visible:ring-ring/45">
              {trainedItems.length > 0 ? 'Other muscles' : 'All muscles'} ({untrainedItems.length})
            </summary>
            <MuscleRankList
              label="Muscles without work"
              items={untrainedItems}
              selected={selected}
              onSelect={toggle}
              onHover={setHovered}
              className="mt-2"
            />
          </details>
        )}
      </div>
    </div>
  );
}

const SKELETON_ROWS = 6;

function MuscleLoadViewSkeleton({
  isSplit,
  isSingleView,
  className,
}: {
  isSplit?: boolean;
  isSingleView?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-5', isSplit && 'md:grid md:grid-cols-2 md:items-start', className)}>
      <div className="flex flex-col gap-3">
        <MuscleMap.Skeleton isSingleView={isSingleView} />
        <Skeleton className="h-4 w-64 max-w-full" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <Skeleton className="h-4 w-48" />
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
          <Skeleton key={index} className="h-11 w-full" />
        ))}
      </div>
    </div>
  );
}

export const MuscleLoadView = Object.assign(MuscleLoadViewRoot, { Skeleton: MuscleLoadViewSkeleton });
