'use client';

import type { ReactNode } from 'react';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface RadarPoint {
  key: string;
  label: string;
  value: number;
}

interface MuscleRadarChartProps {
  points: readonly RadarPoint[];
  // The value as the tooltip says it ("6 sets").
  formatValue: (value: number) => string;
  // Points drawn in Kit Cobalt: hovered or selected, from the chart or from the body.
  activeKeys: readonly string[];
  onHover: (key: string | null) => void;
  onSelect: (key: string) => void;
  className?: string;
}

const HIT_RADIUS = 14;

// Weighted sets per muscle group as a polygon, one spoke per group. It sits beside the body and the two share
// one hover and one selection. The shape is ink on gray (The Quiet Heat Rule); cobalt is only what is being
// pointed at. Each point says its own name and value in a tooltip. It is pointer-only and hidden from
// assistive technology: the ranked list beside it is the text.
function MuscleRadarChartRoot({
  points,
  formatValue,
  activeKeys,
  onHover,
  onSelect,
  className,
}: MuscleRadarChartProps) {
  const peak = Math.max(0, ...points.map((point) => point.value));

  const renderDot = (props: { cx?: number; cy?: number; index: number }): ReactNode => {
    const point = points[props.index];
    // A point with no work sits on the center with every other one; its label is the way to reach it.
    if (!point || point.value <= 0 || props.cx === undefined || props.cy === undefined) return <g key={props.index} />;
    const isActive = activeKeys.includes(point.key);
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: the chart is aria-hidden and pointer-only; the hidden ranked list is the keyboard path.
      <g
        key={point.key}
        className="cursor-pointer"
        onMouseEnter={() => onHover(point.key)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onSelect(point.key)}
      >
        <circle cx={props.cx} cy={props.cy} r={HIT_RADIUS} className="fill-transparent" />
        <circle
          cx={props.cx}
          cy={props.cy}
          r={isActive ? 5 : 3}
          className={cn('stroke-card transition-[r] duration-150', isActive ? 'fill-primary' : 'fill-heat-4')}
          strokeWidth={1.5}
        />
      </g>
    );
  };

  const renderTick = ({
    x,
    y,
    textAnchor,
    payload,
  }: {
    x: number | string;
    y: number | string;
    textAnchor: string;
    payload: { value: unknown; index: number };
  }) => {
    const point = points[payload.index];
    if (!point) return null;
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: the chart is aria-hidden and pointer-only; the hidden ranked list is the keyboard path.
      <text
        x={Number(x)}
        y={Number(y)}
        textAnchor={textAnchor as 'start' | 'middle' | 'end'}
        dominantBaseline="central"
        onMouseEnter={() => onHover(point.key)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onSelect(point.key)}
        className={cn(
          'cursor-pointer font-display text-xs font-semibold tracking-widest uppercase',
          activeKeys.includes(point.key) ? 'fill-primary' : 'fill-muted-foreground',
        )}
      >
        {point.label}
      </text>
    );
  };

  return (
    <ChartContainer
      config={{}}
      aria-hidden
      // The points are redrawn as the active one changes and a redrawn node loses its mouseleave, so leaving the
      // chart is what clears the group in every case.
      onMouseLeave={() => onHover(null)}
      className={cn(
        'mx-auto aspect-4/3 w-full max-w-80 [&_*]:outline-hidden [&_.recharts-wrapper]:outline-hidden',
        className,
      )}
    >
      {/* Recharts makes the whole chart focusable by default, and a click then draws a box around every point. */}
      <RadarChart
        data={[...points]}
        outerRadius="68%"
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        accessibilityLayer={false}
        tabIndex={-1}
      >
        <PolarGrid />
        <PolarAngleAxis dataKey="label" tick={renderTick} />
        <PolarRadiusAxis domain={[0, peak || 1]} tick={false} axisLine={false} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideIndicator
              formatter={(value) => (
                <span className="numerals text-base leading-none font-bold">{formatValue(Number(value))}</span>
              )}
            />
          }
        />
        <Radar
          name="Work"
          dataKey="value"
          fill="var(--heat-4)"
          fillOpacity={0.28}
          stroke="var(--heat-4)"
          strokeWidth={2}
          dot={renderDot}
          activeDot={false}
          animationDuration={300}
        />
      </RadarChart>
    </ChartContainer>
  );
}

function MuscleRadarChartSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn('mx-auto aspect-4/3 w-full max-w-80', className)} />;
}

export const MuscleRadarChart = Object.assign(MuscleRadarChartRoot, { Skeleton: MuscleRadarChartSkeleton });
