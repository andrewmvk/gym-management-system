'use client';

import { type MuscleId, muscleLabel } from '@cadence/shared/schemas/muscles';
import { TriangleAlertIcon } from 'lucide-react';
import { type PointerEvent, useId, useState } from 'react';
import { createPortal } from 'react-dom';
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
  // An injury the member reported: a Pace Tape outline and a tape hatch, because it asks to be looked at.
  isInjured?: boolean;
  // What the hover tooltip says beside the name, already formatted ("6 sets").
  value?: string;
}

export type MuscleMarks = Partial<Record<MuscleId, MuscleMark>>;

// One muscle, or several that light up together (a group hovered in the chart).
export type MuscleHighlight = MuscleId | readonly MuscleId[] | null;

function highlightedMuscles(highlight: MuscleHighlight | undefined): readonly MuscleId[] {
  return typeof highlight === 'string' ? [highlight] : (highlight ?? []);
}

// The height the tooltip needs above the pointer; nearer than this to the top of the screen it goes below.
const TOOLTIP_ROOM = 96;

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
  highlighted?: MuscleHighlight;
  onSelect?: (muscle: MuscleId) => void;
  onHover?: (muscle: MuscleId | null) => void;
  // A floating name and value at the pointer, for a map that has no readout of its own beside it.
  hasTooltip?: boolean;
  className?: string;
}

// Where the pointer is on the screen, not in the map: the tooltip is drawn outside every panel.
interface PointerTarget {
  muscle: MuscleId;
  x: number;
  y: number;
}

interface BodyViewProps extends Omit<MuscleMapProps, 'className' | 'hasTooltip'> {
  paths: MusclePaths;
  box: { width: number; height: number };
  viewLabel: string;
  onPointer?: (event: PointerEvent<SVGGElement>, muscle: MuscleId | null) => void;
  isSkeleton?: boolean;
  className?: string;
}

function emphasisOf(muscle: MuscleId, { marks, selected, highlighted }: BodyViewProps) {
  if (muscle === selected) return 4;
  if (highlightedMuscles(highlighted).includes(muscle)) return 3;
  return marks[muscle]?.isInjured ? 2 : 0;
}

function BodyView(props: BodyViewProps) {
  const {
    marks,
    label,
    selected,
    highlighted,
    onSelect,
    onHover,
    onPointer,
    paths,
    box,
    viewLabel,
    isSkeleton,
    className,
  } = props;
  const hatchId = `hatch-${useId().replace(/:/g, '')}`;
  const isInteractive = Boolean(onSelect) && !isSkeleton;
  const lit = highlightedMuscles(highlighted);

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
        {/* Leans the other way from the equipment hatch, so an injury never reads as lost equipment. */}
        <pattern
          id={`${hatchId}-tape`}
          width="7"
          height="7"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-45)"
        >
          <line x1="0" y1="0" x2="0" y2="7" strokeWidth="3" className="stroke-tape/80" />
        </pattern>
      </defs>
      {muscles.map((muscle) => {
        const mark = marks[muscle];
        const step = isSkeleton ? 0 : (mark?.step ?? 0);
        const isSelected = muscle === selected;
        const isHighlighted = lit.includes(muscle);
        const isInjured = Boolean(mark?.isInjured) && !isSkeleton;
        const isOutlined = isSelected || isHighlighted || isInjured;
        const isDashed = !isOutlined && mark?.isGap && !isSkeleton;
        const outlineWidth = isSelected || (isInjured && !isHighlighted) ? 3 : 2;
        const hasHalo = isSelected || isHighlighted || isInjured;
        const hatchFill = `url(#${hatchId}-${step >= 3 ? 'card' : 'ink'})`;

        return (
          <g
            key={muscle}
            aria-hidden
            className={cn(isInteractive && 'cursor-pointer')}
            onClick={isInteractive ? () => onSelect?.(muscle) : undefined}
            onPointerEnter={isInteractive ? () => onHover?.(muscle) : undefined}
            onPointerMove={isInteractive && onPointer ? (event) => onPointer(event, muscle) : undefined}
            onPointerLeave={
              isInteractive
                ? (event) => {
                    onHover?.(null);
                    onPointer?.(event, null);
                  }
                : undefined
            }
          >
            {isInteractive && !onPointer && (
              <title>{isInjured ? `${muscleLabel(muscle)}, injured` : muscleLabel(muscle)}</title>
            )}
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
                strokeDasharray={isDashed ? '4 3' : undefined}
                className={cn(
                  'transition-[fill,stroke] duration-300 ease-out-expo',
                  isSkeleton ? 'fill-foreground/7' : HEAT_FILL[step],
                  isOutlined
                    ? isInjured && !isSelected && !isHighlighted
                      ? 'stroke-tape'
                      : 'stroke-primary'
                    : isDashed
                      ? 'stroke-foreground/45'
                      : step === 0 && !isSkeleton
                        ? 'stroke-foreground/25'
                        : 'stroke-card',
                )}
              />
            ))}
            {isInjured &&
              paths[muscle]?.map((shape, index) => (
                <path
                  // biome-ignore lint/suspicious/noArrayIndexKey: a muscle's shapes are static and never reordered.
                  key={index}
                  d={shape.d}
                  transform={shape.transform}
                  fill={`url(#${hatchId}-tape)`}
                  className="pointer-events-none"
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

// The Popover pattern: Card-colored, Hairline border, Popover shadow. It follows the pointer and never
// takes it, so the muscle under it keeps receiving hover.
function MuscleTooltip({ target, mark }: { target: PointerTarget; mark?: MuscleMark }) {
  const half = 72;
  // Above the pointer, unless that would leave the screen: a sticky header or the top edge never covers it.
  const isBelow = target.y < TOOLTIP_ROOM;
  return createPortal(
    <div
      aria-hidden
      className={cn(
        'pointer-events-none fixed z-100 flex min-w-28 -translate-x-1/2 flex-col gap-0.5 rounded-md border bg-card px-3 py-2 shadow-popover',
        !isBelow && '-translate-y-full',
      )}
      style={{
        left: Math.min(Math.max(target.x, half), Math.max(window.innerWidth - half, half)),
        top: isBelow ? target.y + 20 : target.y - 14,
      }}
    >
      <span className="flex items-center gap-1.5 font-display text-sm font-bold tracking-wide whitespace-nowrap uppercase">
        {muscleLabel(target.muscle)}
        {mark?.isInjured && (
          <span className="flex size-4 items-center justify-center rounded-xs bg-tape text-tape-foreground">
            <TriangleAlertIcon className="size-3" />
          </span>
        )}
      </span>
      {mark?.value && <span className="numerals text-xl leading-none font-bold whitespace-nowrap">{mark.value}</span>}
    </div>,
    document.body,
  );
}

// Front and back sit side by side from sm; a phone shows one at a time behind a toggle. A narrow
// container (a form column) can ask for the single view at every size, and a compact panel can ask for
// both bodies at every size, scaled to a fixed height so the map never takes more than a screen.
function MuscleMapRoot({
  className,
  isSingleView,
  isPaired,
  hasTooltip,
  ...props
}: MuscleMapProps & { isSingleView?: boolean; isPaired?: boolean }) {
  const [view, setView] = useState<ViewKey>('front');
  const [pointer, setPointer] = useState<PointerTarget | null>(null);

  // A muscle picked from the list may live on the side that is hidden: turn the body to it.
  const target = highlightedMuscles(props.highlighted)[0] ?? props.selected;
  if (target && !isPaired && !VIEWS[view].paths[target]) {
    const next = VIEW_OPTIONS.find((option) => VIEWS[option.value].paths[target]);
    if (next) setView(next.value);
  }

  const trackPointer = (event: PointerEvent<SVGGElement>, muscle: MuscleId | null) => {
    if (!muscle || event.pointerType === 'touch') {
      setPointer(null);
      return;
    }
    setPointer({ muscle, x: event.clientX, y: event.clientY });
  };

  const hiddenBelowSm = isSingleView ? 'hidden' : 'hidden sm:block';

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <SegmentedFilter
        label="Body view"
        value={view}
        options={VIEW_OPTIONS}
        onChange={setView}
        className={cn(isPaired ? 'hidden' : !isSingleView && 'sm:hidden')}
      />
      <div
        className={cn(
          'mx-auto grid w-full gap-4',
          isPaired ? 'max-w-sm grid-cols-2 gap-2' : isSingleView ? 'max-w-xs' : 'max-w-md sm:max-w-lg sm:grid-cols-2',
        )}
      >
        {VIEW_OPTIONS.map(({ value }) => (
          <BodyView
            key={value}
            {...props}
            paths={VIEWS[value].paths}
            box={VIEWS[value].box}
            viewLabel={VIEWS[value].label}
            onPointer={hasTooltip ? trackPointer : undefined}
            className={cn(!isPaired && view !== value && hiddenBelowSm, 'mx-auto', isPaired ? 'max-h-72' : 'max-h-120')}
          />
        ))}
        {hasTooltip && pointer && <MuscleTooltip target={pointer} mark={props.marks[pointer.muscle]} />}
      </div>
    </div>
  );
}

function MuscleMapSkeleton({
  className,
  isSingleView,
  isPaired,
}: {
  className?: string;
  isSingleView?: boolean;
  isPaired?: boolean;
}) {
  const hiddenBelowSm = isSingleView ? 'hidden' : 'hidden sm:block';
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <Skeleton className={cn('h-11 w-full', isPaired ? 'hidden' : !isSingleView && 'sm:hidden')} />
      <div
        className={cn(
          'mx-auto grid w-full animate-pulse gap-4',
          isPaired ? 'max-w-sm grid-cols-2 gap-2' : isSingleView ? 'max-w-xs' : 'max-w-md sm:max-w-lg sm:grid-cols-2',
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
            className={cn(
              value === 'back' && !isPaired && hiddenBelowSm,
              'mx-auto',
              isPaired ? 'max-h-72' : 'max-h-120',
            )}
          />
        ))}
      </div>
    </div>
  );
}

export const MuscleMap = Object.assign(MuscleMapRoot, { Skeleton: MuscleMapSkeleton });
