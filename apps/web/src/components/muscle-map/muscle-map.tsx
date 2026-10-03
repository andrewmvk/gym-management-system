'use client';

import { type MuscleId, muscleLabel } from '@cadence/shared/schemas/muscles';
import { useId, useState } from 'react';
import {
  BACK_PATHS,
  BACK_VIEWBOX,
  FRONT_PATHS,
  FRONT_VIEWBOX,
  type MusclePaths,
} from '@/components/muscle-map/muscle-paths';
import { SegmentedFilter } from '@/components/segmented-filter';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface MuscleMark {
  // 0 is no work, 1 to 5 climb the heat ramp.
  step: number;
  // Lost to unavailable equipment: drawn as a hatch over the fill.
  isLost?: boolean;
  // Nothing trains this muscle at all: drawn as a dashed outline.
  isGap?: boolean;
  // The member's own emphasis: drawn as a cobalt outline, dashed when it is less.
  bias?: number;
}

export type MuscleMarks = Partial<Record<MuscleId, MuscleMark>>;

const HEAT_FILL = ['fill-heat-0', 'fill-heat-1', 'fill-heat-2', 'fill-heat-3', 'fill-heat-4', 'fill-heat-5'] as const;

const VIEWS = {
  front: { label: 'Front', paths: FRONT_PATHS, box: FRONT_VIEWBOX },
  back: { label: 'Back', paths: BACK_PATHS, box: BACK_VIEWBOX },
} as const;

type ViewKey = keyof typeof VIEWS;
const VIEW_OPTIONS = (Object.keys(VIEWS) as ViewKey[]).map((value) => ({ value, label: VIEWS[value].label }));

interface MuscleMapProps {
  marks: MuscleMarks;
  label: string;
  selected?: MuscleId | null;
  highlighted?: MuscleId | null;
  onSelect?: (muscle: MuscleId) => void;
  onHover?: (muscle: MuscleId | null) => void;
  className?: string;
}

interface BodyViewProps extends Omit<MuscleMapProps, 'className'> {
  paths: MusclePaths;
  box: { width: number; height: number };
  viewLabel: string;
  isSkeleton?: boolean;
  className?: string;
}

function emphasisOf(muscle: MuscleId, { marks, selected, highlighted }: BodyViewProps) {
  if (muscle === selected) return 3;
  if (muscle === highlighted) return 2;
  return marks[muscle]?.bias ? 1 : 0;
}

function BodyView(props: BodyViewProps) {
  const { marks, label, selected, highlighted, onSelect, onHover, paths, box, viewLabel, isSkeleton, className } =
    props;
  const hatchId = `hatch-${useId().replace(/:/g, '')}`;
  const isInteractive = Boolean(onSelect) && !isSkeleton;

  // Drawn last so its outline is never covered by a neighbor's stroke.
  const muscles = (Object.keys(paths) as MuscleId[]).sort((a, b) => emphasisOf(a, props) - emphasisOf(b, props));

  return (
    <svg
      viewBox={`0 0 ${box.width} ${box.height}`}
      role="img"
      aria-label={`${label}, ${viewLabel.toLowerCase()} view`}
      className={cn('h-auto w-full', className)}
    >
      <defs>
        {/* Ink hatch reads on the pale steps, card-colored hatch on the dark ones, in both themes. */}
        <pattern id={`${hatchId}-ink`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="7" strokeWidth="3" className="stroke-foreground/60" />
        </pattern>
        <pattern
          id={`${hatchId}-card`}
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="7" strokeWidth="3" className="stroke-card/80" />
        </pattern>
      </defs>
      {muscles.map((muscle) => {
        const mark = marks[muscle];
        const step = isSkeleton ? 0 : (mark?.step ?? 0);
        const isSelected = muscle === selected;
        const isHighlighted = muscle === highlighted;
        const hasBias = Boolean(mark?.bias);
        const isOutlined = isSelected || isHighlighted || hasBias;
        const isDashed = !isOutlined && mark?.isGap && !isSkeleton;
        const outlineWidth = isSelected ? 3 : 2;
        const hasHalo = isSelected || isHighlighted;
        const hatchFill = `url(#${hatchId}-${step >= 3 ? 'card' : 'ink'})`;

        return (
          <g
            key={muscle}
            aria-hidden
            className={cn(isInteractive && 'cursor-pointer')}
            onClick={isInteractive ? () => onSelect?.(muscle) : undefined}
            onPointerEnter={isInteractive ? () => onHover?.(muscle) : undefined}
            onPointerLeave={isInteractive ? () => onHover?.(null) : undefined}
          >
            {isInteractive && <title>{muscleLabel(muscle)}</title>}
            {hasHalo &&
              paths[muscle]?.map((shape, index) => (
                <path
                  // biome-ignore lint/suspicious/noArrayIndexKey: a muscle's shapes are static and never reordered.
                  key={index}
                  d={shape.d}
                  transform={shape.transform}
                  vectorEffect="non-scaling-stroke"
                  strokeWidth={outlineWidth + 3}
                  className="pointer-events-none fill-none stroke-card"
                />
              ))}
            {paths[muscle]?.map((shape, index) => (
              <path
                // biome-ignore lint/suspicious/noArrayIndexKey: a muscle's shapes are static and never reordered.
                key={index}
                d={shape.d}
                transform={shape.transform}
                vectorEffect="non-scaling-stroke"
                strokeWidth={isOutlined ? outlineWidth : 1.5}
                strokeDasharray={isDashed || (hasBias && (mark?.bias ?? 0) < 0) ? '4 3' : undefined}
                className={cn(
                  'transition-[fill,stroke] duration-300 ease-out-expo',
                  isSkeleton ? 'fill-foreground/7' : HEAT_FILL[step],
                  isOutlined
                    ? 'stroke-primary'
                    : isDashed
                      ? 'stroke-foreground/45'
                      : step === 0 && !isSkeleton
                        ? 'stroke-foreground/25'
                        : 'stroke-card',
                )}
              />
            ))}
            {mark?.isLost &&
              !isSkeleton &&
              paths[muscle]?.map((shape, index) => (
                <path
                  // biome-ignore lint/suspicious/noArrayIndexKey: a muscle's shapes are static and never reordered.
                  key={index}
                  d={shape.d}
                  transform={shape.transform}
                  fill={hatchFill}
                  className="pointer-events-none"
                />
              ))}
          </g>
        );
      })}
    </svg>
  );
}

// Front and back sit side by side from sm; a phone shows one at a time behind a toggle. A narrow
// container (a form column) can ask for the single view at every size.
function MuscleMapRoot({ className, isSingleView, ...props }: MuscleMapProps & { isSingleView?: boolean }) {
  const [view, setView] = useState<ViewKey>('front');

  // A muscle picked from the list may live on the side that is hidden: turn the body to it.
  const target = props.highlighted ?? props.selected;
  if (target && !VIEWS[view].paths[target]) {
    const next = VIEW_OPTIONS.find((option) => VIEWS[option.value].paths[target]);
    if (next) setView(next.value);
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <SegmentedFilter
        label="Body view"
        value={view}
        options={VIEW_OPTIONS}
        onChange={setView}
        className={cn(!isSingleView && 'sm:hidden')}
      />
      <div
        className={cn('mx-auto grid w-full gap-4', isSingleView ? 'max-w-xs' : 'max-w-md sm:max-w-lg sm:grid-cols-2')}
      >
        {VIEW_OPTIONS.map(({ value }) => (
          <BodyView
            key={value}
            {...props}
            paths={VIEWS[value].paths}
            box={VIEWS[value].box}
            viewLabel={VIEWS[value].label}
            className={cn(view !== value && (isSingleView ? 'hidden' : 'hidden sm:block'), 'mx-auto max-h-120')}
          />
        ))}
      </div>
    </div>
  );
}

function MuscleMapSkeleton({ className, isSingleView }: { className?: string; isSingleView?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <Skeleton className={cn('h-11 w-full', !isSingleView && 'sm:hidden')} />
      <div
        className={cn(
          'mx-auto grid w-full animate-pulse gap-4',
          isSingleView ? 'max-w-xs' : 'max-w-md sm:max-w-lg sm:grid-cols-2',
        )}
      >
        {VIEW_OPTIONS.map(({ value }) => (
          <BodyView
            key={value}
            marks={{}}
            label="Loading"
            paths={VIEWS[value].paths}
            box={VIEWS[value].box}
            viewLabel={VIEWS[value].label}
            isSkeleton
            className={cn(value === 'back' && (isSingleView ? 'hidden' : 'hidden sm:block'), 'mx-auto max-h-120')}
          />
        ))}
      </div>
    </div>
  );
}

export const MuscleMap = Object.assign(MuscleMapRoot, { Skeleton: MuscleMapSkeleton });
