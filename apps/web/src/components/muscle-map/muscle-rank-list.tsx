import { type MuscleId, muscleLabel } from '@cadence/shared/schemas/muscles';
import { TriangleAlertIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { HATCH_STYLE } from '@/components/muscle-map/muscle-legend';
import { cn } from '@/lib/utils';

const STEP_SWATCHES = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4', 'bg-heat-5'] as const;

export interface MuscleRankItem {
  muscle: MuscleId;
  step: number;
  value: ReactNode;
  isLost?: boolean;
  isGap?: boolean;
  bias?: number;
  isInjured?: boolean;
}

interface MuscleRankListProps {
  label: string;
  items: readonly MuscleRankItem[];
  // Left out when the row's own value already says whether it is chosen (the selector).
  selected?: MuscleId | null;
  onSelect: (muscle: MuscleId) => void;
  onHover?: (muscle: MuscleId | null) => void;
  className?: string;
}

function BiasTag({ bias }: { bias: number }) {
  return (
    <span
      className="numerals text-base font-bold text-primary"
      title="Your focus"
      role="img"
      aria-label={`focus ${bias}`}
    >
      {bias > 0 ? `+${bias}` : bias}
    </span>
  );
}

// The keyboard and screen-reader path to the body: every muscle on the map is a button here.
export function MuscleRankList({ label, items, selected, onSelect, onHover, className }: MuscleRankListProps) {
  return (
    <ul aria-label={label} className={cn('flex flex-col', className)}>
      {items.map((item) => {
        const isSelected = item.muscle === selected;
        return (
          <li key={item.muscle} className="border-b last:border-b-0">
            <button
              type="button"
              aria-pressed={selected === undefined ? undefined : isSelected}
              onClick={() => onSelect(item.muscle)}
              onPointerEnter={() => onHover?.(item.muscle)}
              onPointerLeave={() => onHover?.(null)}
              onFocus={() => onHover?.(item.muscle)}
              onBlur={() => onHover?.(null)}
              className={cn(
                'flex min-h-11 w-full items-center gap-3 px-2 py-2 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/45',
                isSelected && 'bg-accent/60',
              )}
            >
              <span
                aria-hidden
                style={item.isLost ? HATCH_STYLE : undefined}
                className={cn(
                  'size-4 shrink-0 rounded-xs',
                  STEP_SWATCHES[item.step],
                  item.isGap && 'border border-dashed border-foreground/45 bg-transparent',
                )}
              />
              <span className={cn('min-w-0 flex-1 truncate text-sm', isSelected ? 'font-bold' : 'font-semibold')}>
                {muscleLabel(item.muscle)}
                {item.isInjured && <span className="sr-only">, injured</span>}
              </span>
              {item.isInjured && (
                <span
                  aria-hidden
                  title="Injury you reported"
                  className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-tape text-tape-foreground"
                >
                  <TriangleAlertIcon className="size-3.5" />
                </span>
              )}
              {item.bias ? <BiasTag bias={item.bias} /> : null}
              <span className="numerals shrink-0 text-xl leading-none font-bold">{item.value}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
