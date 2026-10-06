'use client';

import { type CSSProperties, memo, useMemo } from 'react';
import { Bar, BarChart, Cell, LabelList, Text, XAxis, YAxis } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Both charts use the same row pitch, label gutter and bar, so a bar of one lines up with the same rank of the other.
const ROW_HEIGHT = 30;
const BAR_SIZE = 20;
const LABEL_WIDTH = 120;
const VALUE_ROOM = 40;
// Both charts show the same window and scroll inside it, so they stay level however many rows each one has.
const VIEWPORT_CLASS = 'h-80 overflow-y-auto';

export interface DemandDatum {
  key: string;
  name: string;
  value: number;
  isOutOfService?: boolean;
}

interface DemandChartProps {
  title: string;
  caption: string;
  data: readonly DemandDatum[];
  formatValue: (value: number) => string;
  // Drawn in Kit Cobalt: the one being pointed at, from the chart or from somewhere else on the board.
  activeKey?: string | null;
  selectedKey?: string | null;
  onHover?: (key: string | null) => void;
  onSelect?: (key: string) => void;
}

function HeaderRow({ title, caption }: { title: string; caption?: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b px-2 pb-2">
      <h3 className="font-display text-xl font-bold tracking-wide uppercase">{title}</h3>
      {caption && <span className="text-sm text-muted-foreground">{caption}</span>}
    </div>
  );
}

// A ranked bar chart: one measure (plans) over a long list of named things, so the names sit as labels on the
// left and the bars grow from one baseline. The bars are ink on gray (The Quiet Heat Rule); cobalt is only what is
// being pointed at.
//
// The drawing is static. Recharts is the slow part of a hover (it re-lays-out the whole chart on a state change and
// on every pointer move), so it never hears about the pointer: a list of rows sits behind it, those rows take the
// hover, click and focus, and the pointed-at bar is recolored through a CSS variable on the wrapper instead of a
// redraw. The rows are also the text for screen readers, and for a muscle the keyboard path.
function DemandChartRoot({
  title,
  caption,
  data,
  formatValue,
  activeKey,
  selectedKey,
  onHover,
  onSelect,
}: DemandChartProps) {
  const chart = useMemo(() => {
    const peak = Math.max(1, ...data.map((datum) => datum.value));

    const renderLabel = ({
      x,
      y,
      payload,
      index,
    }: {
      x: number | string;
      y: number | string;
      payload: { value: unknown };
      index: number;
    }) => {
      const datum = data[index];
      if (!datum) return null;
      return (
        <g>
          <title>{datum.isOutOfService ? `${datum.name}, out of service` : datum.name}</title>
          <Text
            x={Number(x) - 8}
            y={Number(y)}
            width={LABEL_WIDTH - 8}
            maxLines={1}
            textAnchor="end"
            verticalAnchor="middle"
            textDecoration={datum.isOutOfService ? 'line-through' : undefined}
            className={cn('text-sm font-semibold', datum.isOutOfService ? 'fill-muted-foreground' : 'fill-foreground')}
          >
            {String(payload.value)}
          </Text>
        </g>
      );
    };

    const renderValue = (props: {
      x?: number | string;
      y?: number | string;
      width?: number | string;
      height?: number | string;
      index?: number;
    }) => {
      const datum = props.index === undefined ? undefined : data[props.index];
      if (!datum) return null;
      return (
        <text
          x={Number(props.x) + Number(props.width) + 8}
          y={Number(props.y) + Number(props.height) / 2}
          dominantBaseline="central"
          className={cn('numerals text-lg font-bold', datum.value === 0 ? 'fill-muted-foreground' : 'fill-foreground')}
        >
          {formatValue(datum.value)}
        </text>
      );
    };

    return (
      // Recharts makes the whole chart focusable by default, and a click then draws a box around it.
      <BarChart
        data={[...data]}
        layout="vertical"
        margin={{ top: 0, right: VALUE_ROOM, bottom: 0, left: 0 }}
        barCategoryGap={0}
        accessibilityLayer={false}
        tabIndex={-1}
      >
        <XAxis type="number" hide domain={[0, peak]} />
        <YAxis
          type="category"
          dataKey="name"
          width={LABEL_WIDTH}
          interval={0}
          tickLine={false}
          axisLine={false}
          tick={renderLabel}
        />
        {/* A bar that animates hides its labels until it stops, and a redraw restarts it, so they would blink away. */}
        <Bar dataKey="value" barSize={BAR_SIZE} radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {data.map((datum, index) => (
            <Cell key={datum.key} fill={`var(--demand-active-${index}, var(--heat-4))`} />
          ))}
          <LabelList dataKey="value" content={renderValue} />
        </Bar>
      </BarChart>
    );
  }, [data, formatValue]);

  const rows = useMemo(
    () => (
      <ul aria-label={`${title}, ${caption}`} className="absolute inset-0 flex flex-col">
        {data.map((datum) => {
          const text = (
            <span className="sr-only">
              {datum.name}
              {datum.isOutOfService && ', out of service'}: {formatValue(datum.value)}
            </span>
          );
          return (
            <li key={datum.key} style={{ height: ROW_HEIGHT }}>
              {onSelect ? (
                <button
                  type="button"
                  aria-pressed={selectedKey === datum.key}
                  onClick={() => onSelect(datum.key)}
                  onPointerEnter={() => onHover?.(datum.key)}
                  onPointerLeave={() => onHover?.(null)}
                  onFocus={() => onHover?.(datum.key)}
                  onBlur={() => onHover?.(null)}
                  className="block size-full outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/45 focus-visible:ring-inset aria-pressed:bg-accent/60"
                >
                  {text}
                </button>
              ) : (
                <div className="size-full hover:bg-muted/60">{text}</div>
              )}
            </li>
          );
        })}
      </ul>
    ),
    [data, formatValue, selectedKey, onHover, onSelect, title, caption],
  );

  const activeIndex = activeKey ? data.findIndex((datum) => datum.key === activeKey) : -1;
  const wrapperStyle = {
    height: data.length * ROW_HEIGHT,
    ...(activeIndex >= 0 && { [`--demand-active-${activeIndex}`]: 'var(--primary)' }),
  } as CSSProperties;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <HeaderRow title={title} caption={caption} />
      <div className={VIEWPORT_CLASS}>
        <div className="relative" style={wrapperStyle}>
          {rows}
          <ChartContainer
            config={{}}
            aria-hidden
            className="pointer-events-none relative aspect-auto h-full w-full justify-start [&_*]:outline-hidden [&_.recharts-wrapper]:outline-hidden"
          >
            {chart}
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}

function DemandChartSkeleton({ title, caption, rows }: { title: string; caption: string; rows: number }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <HeaderRow title={title} caption={caption} />
      <div className={cn(VIEWPORT_CLASS, 'flex flex-col overflow-hidden')}>
        {Array.from({ length: rows }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
          <div key={index} className="flex items-center gap-2" style={{ height: ROW_HEIGHT }}>
            <Skeleton className="h-5" style={{ width: LABEL_WIDTH - 8 }} />
            <Skeleton className="h-5 flex-1" style={{ maxWidth: `${100 - index * 9}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export const DemandChart = Object.assign(memo(DemandChartRoot), { Skeleton: DemandChartSkeleton });
