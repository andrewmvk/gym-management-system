'use client';

import { groupMuscleLoad, heatStep, type MuscleLoad, peakLoad, rankMuscles } from '@cadence/shared/schemas/muscle-heat';
import {
  MUSCLE_GROUPS,
  MUSCLE_IDS,
  type MuscleGroupId,
  type MuscleId,
  muscleGroupOf,
  muscleLabel,
} from '@cadence/shared/schemas/muscles';
import { type ReactNode, useState } from 'react';
import { MuscleLegend } from '@/components/muscle-map/muscle-legend';
import { MuscleMap } from '@/components/muscle-map/muscle-map';
import { formatSets, marksFromLoad } from '@/components/muscle-map/muscle-marks';
import { MuscleRadarChart, type RadarPoint } from '@/components/muscle-map/muscle-radar-chart';
import { MuscleRankList } from '@/components/muscle-map/muscle-rank-list';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const SUMMARY_MUSCLES = 3;

const GROUP_BY_ID = Object.fromEntries(MUSCLE_GROUPS.map((group) => [group.id, group])) as Record<
  MuscleGroupId,
  (typeof MUSCLE_GROUPS)[number]
>;

// A dashed Kit Cobalt frame is the page's way of saying "you can point the coach at what is inside".
const POINTABLE_FRAME = 'rounded-md outline-2 outline-offset-4 outline-dashed outline-primary/60';

export type MusclePointTarget =
  | { type: 'muscle'; muscle: MuscleId }
  | { type: 'group'; group: MuscleGroupId }
  | { type: 'distribution' };

// The coach's pointing mode, as the map sees it: whether it is on, what is already in the message and what a
// tap adds. The map knows nothing else about the coach.
export interface MusclePointing {
  isActive: boolean;
  isMarked: (target: MusclePointTarget) => boolean;
  onPoint: (target: MusclePointTarget) => void;
}

interface MuscleLoadViewProps {
  load: MuscleLoad;
  label: string;
  detail?: (muscle: MuscleId) => ReactNode;
  includeUntrained?: boolean;
  // For a narrow column: one body at a time behind the Front/Back toggle at every width.
  isSingleView?: boolean;
  // For a compact panel: both bodies at every width, scaled to a fixed height.
  isPaired?: boolean;
  // What sits beside the body. "groups" is a radar that follows the body's hover and selection; "list"
  // is every muscle ranked, for views where the exact per-muscle number is the point.
  breakdown?: 'groups' | 'list';
  emptyNote?: string;
  // Says what the numbers count when it is not weighted sets. `null` hides the line.
  note?: string | null;
  // What one unit of the load is called, when it is not a set.
  unit?: { singular: string; plural: string };
  // Labels the ramp ends and, when it has a gap label, outlines the muscles with no work in dashes.
  legend?: { lowLabel: string; highLabel: string; gapLabel?: string };
  selected?: MuscleId | null;
  onSelectedChange?: (muscle: MuscleId | null) => void;
  // Injuries the member reported: the muscle and what they said, drawn on the body and flagged in the list.
  injured?: ReadonlyMap<MuscleId, string>;
  pointing?: MusclePointing;
  className?: string;
}

// A heat map of weighted sets with a breakdown beside it. The map is for looking and tapping; the
// breakdown (radar or ranked list) is its other half and the two share one hover and one selection.
// Beside the map it is a ranked list's text that is the keyboard and screen-reader path, so with the radar the
// same list stays in the page for them, visually hidden. Selection is local unless the parent passes it in.
function MuscleLoadViewRoot({
  load,
  label,
  detail,
  includeUntrained,
  isSingleView,
  isPaired,
  breakdown = 'groups',
  emptyNote = 'No muscle work to show yet.',
  note = 'Counted in weighted sets. A supporting muscle counts half.',
  unit = { singular: 'set', plural: 'sets' },
  legend,
  selected: controlledSelected,
  onSelectedChange,
  injured,
  pointing,
  className,
}: MuscleLoadViewProps) {
  const [localSelected, setLocalSelected] = useState<MuscleId | null>(null);
  const [hovered, setHovered] = useState<MuscleId | null>(null);
  const [hoveredGroup, setHoveredGroup] = useState<MuscleGroupId | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroupId | null>(null);
  const selected = controlledSelected === undefined ? localSelected : controlledSelected;
  const setSelected = onSelectedChange ?? setLocalSelected;
  const isChart = breakdown === 'groups';

  const ranked = rankMuscles(load);
  const peak = peakLoad(load);
  const unitOf = (value: number) => (value === 1 ? unit.singular : unit.plural);
  const toggle = (muscle: MuscleId) => {
    setSelectedGroup(null);
    setSelected(selected === muscle ? null : muscle);
  };
  const toggleGroup = (group: MuscleGroupId) => {
    setSelected(null);
    setSelectedGroup(selectedGroup === group ? null : group);
  };

  const trainedItems = ranked.map(({ muscle, load: value }) => ({
    muscle,
    step: heatStep(value, peak),
    value: formatSets(value),
    isInjured: injured?.has(muscle),
  }));
  const untrainedItems = MUSCLE_IDS.filter((muscle) => !load[muscle]).map((muscle) => ({
    muscle,
    step: 0,
    value: '0',
    isInjured: injured?.has(muscle),
  }));

  const marks = marksFromLoad(load);
  for (const muscle of MUSCLE_IDS) {
    const mark = marks[muscle];
    if (!mark) continue;
    mark.value = `${formatSets(load[muscle] ?? 0)} ${unitOf(load[muscle] ?? 0)}`;
    if (injured?.has(muscle)) mark.isInjured = true;
    if (legend?.gapLabel && !load[muscle]) mark.isGap = true;
  }

  const groups = groupMuscleLoad(load);
  const groupInFocus = hoveredGroup ?? (selected ? null : selectedGroup);
  const highlighted = hovered ?? (groupInFocus ? GROUP_BY_ID[groupInFocus].muscles : null);
  const activeGroup = hovered
    ? muscleGroupOf(hovered)
    : (hoveredGroup ?? (selected ? muscleGroupOf(selected) : selectedGroup));

  // While the member is pointing the coach at things, a tap adds the muscle or group to the message instead
  // of selecting it, and whatever is already in the message stays drawn.
  const isPointing = Boolean(pointing?.isActive);
  const markedGroups = isPointing
    ? MUSCLE_GROUPS.filter((group) => pointing?.isMarked({ type: 'group', group: group.id }))
    : [];
  const markedMuscles = isPointing
    ? MUSCLE_IDS.filter(
        (muscle) =>
          pointing?.isMarked({ type: 'muscle', muscle }) ||
          markedGroups.some((group) => muscleGroupOf(muscle) === group.id),
      )
    : [];
  const mapHighlight: MuscleId[] = [
    ...(typeof highlighted === 'string' ? [highlighted] : (highlighted ?? [])),
    ...markedMuscles,
  ];

  const radarPoints: RadarPoint[] = groups.map((entry) => ({
    key: entry.group,
    label: GROUP_BY_ID[entry.group].label,
    value: entry.load,
  }));
  const radarActiveKeys: string[] = [...(activeGroup ? [activeGroup] : []), ...markedGroups.map((group) => group.id)];
  const hoverRadarKey = (key: string | null) =>
    setHoveredGroup(MUSCLE_GROUPS.find((group) => group.id === key)?.id ?? null);
  const selectRadarKey = (key: string) => {
    const group = MUSCLE_GROUPS.find((entry) => entry.id === key);
    if (!group) return;
    if (isPointing) pointing?.onPoint({ type: 'group', group: group.id });
    else toggleGroup(group.id);
  };
  const selectMuscle = (muscle: MuscleId) => {
    if (isPointing) pointing?.onPoint({ type: 'muscle', muscle });
    else toggle(muscle);
  };

  const summary =
    ranked.length > 0
      ? `Most work: ${ranked
          .slice(0, SUMMARY_MUSCLES)
          .map((entry) => muscleLabel(entry.muscle))
          .join(', ')}.`
      : emptyNote;

  const rankLists = (
    <>
      {trainedItems.length > 0 && (
        <MuscleRankList
          label={`${label}, ranked`}
          items={isChart && includeUntrained ? [...trainedItems, ...untrainedItems] : trainedItems}
          selected={selected}
          onSelect={selectMuscle}
          onHover={setHovered}
          className={cn(isChart && 'sr-only')}
        />
      )}
      {!isChart && includeUntrained && (
        <details className="group">
          <summary className="flex min-h-11 items-center font-display text-sm font-semibold tracking-widest text-muted-foreground uppercase outline-none focus-visible:ring-3 focus-visible:ring-ring/45">
            {trainedItems.length > 0 ? 'Other muscles' : 'All muscles'} ({untrainedItems.length})
          </summary>
          <MuscleRankList
            label="Muscles without work"
            items={untrainedItems}
            selected={selected}
            onSelect={selectMuscle}
            onHover={setHovered}
            className="mt-2"
          />
        </details>
      )}
    </>
  );

  return (
    <div className={cn('@container', className)}>
      <div className="flex flex-col gap-5 @xl:grid @xl:grid-cols-2 @xl:items-start">
        <div className="flex flex-col gap-3">
          <MuscleMap
            isSingleView={isSingleView}
            isPaired={isPaired}
            hasTooltip
            marks={marks}
            label={label}
            selected={selected}
            highlighted={mapHighlight}
            onSelect={selectMuscle}
            onHover={setHovered}
            className={cn(isPointing && POINTABLE_FRAME)}
          />
          <MuscleLegend
            lowLabel={legend?.lowLabel}
            highLabel={legend?.highLabel}
            hasGap={Boolean(legend?.gapLabel)}
            hasInjury={Boolean(injured?.size)}
            gapLabel={legend?.gapLabel}
          />
          {!isChart && note && <p className="text-xs text-muted-foreground">{note}</p>}
        </div>
        {isChart ? (
          <div className="flex min-w-0 flex-col gap-3">
            {ranked.length > 0 && (
              <MuscleRadarChart
                points={radarPoints}
                formatValue={(value) => `${formatSets(value)} ${unitOf(value)}`}
                activeKeys={radarActiveKeys}
                onHover={hoverRadarKey}
                onSelect={selectRadarKey}
                className={cn(isPointing && POINTABLE_FRAME)}
              />
            )}
            <div className="flex flex-col gap-1" aria-live="polite">
              <p className="text-sm text-pretty text-muted-foreground">{summary}</p>
              {note && ranked.length > 0 && <p className="text-xs text-muted-foreground">{note}</p>}
            </div>
            {selected && detail?.(selected)}
            {rankLists}
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-4">
            <p className="text-sm text-pretty text-muted-foreground" aria-live="polite">
              {summary}
            </p>
            {selected && detail?.(selected)}
            {rankLists}
          </div>
        )}
      </div>
    </div>
  );
}

const SKELETON_ROWS = 6;

function MuscleLoadViewSkeleton({
  isSingleView,
  isPaired,
  breakdown = 'groups',
  className,
}: {
  isSingleView?: boolean;
  isPaired?: boolean;
  breakdown?: 'groups' | 'list';
  className?: string;
}) {
  return (
    <div className={cn('@container', className)}>
      <div className="flex flex-col gap-5 @xl:grid @xl:grid-cols-2 @xl:items-start">
        <div className="flex flex-col gap-3">
          <MuscleMap.Skeleton isSingleView={isSingleView} isPaired={isPaired} />
          <Skeleton className="h-4 w-64 max-w-full" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
        {breakdown === 'groups' ? (
          <div className="flex min-w-0 flex-col gap-3">
            <Skeleton className="h-11 w-full" />
            <MuscleRadarChart.Skeleton />
            <div className="flex min-h-16 flex-col justify-center gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-col gap-2">
            <Skeleton className="h-4 w-48" />
            {Array.from({ length: SKELETON_ROWS }, (_, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const MuscleLoadView = Object.assign(MuscleLoadViewRoot, { Skeleton: MuscleLoadViewSkeleton });
