import { cn } from '@/lib/utils';

const STEP_SWATCHES = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4', 'bg-heat-5'] as const;

export const HATCH_STYLE = {
  backgroundImage:
    'repeating-linear-gradient(135deg, transparent 0 2px, color-mix(in oklch, var(--foreground) 60%, transparent) 2px 4px)',
} as const;

interface MuscleLegendProps {
  lowLabel?: string;
  highLabel?: string;
  hasLost?: boolean;
  hasGap?: boolean;
  gapLabel?: string;
  className?: string;
}

export function MuscleLegend({
  lowLabel = 'Less',
  highLabel = 'More',
  hasLost,
  hasGap,
  gapLabel = 'No exercise trains it',
  className,
}: MuscleLegendProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground', className)}>
      <div className="flex items-center gap-2">
        <span>{lowLabel}</span>
        <span className="flex gap-0.5" aria-hidden>
          {STEP_SWATCHES.map((swatch) => (
            <span key={swatch} className={cn('h-3 w-5 -skew-x-12 rounded-xs', swatch)} />
          ))}
        </span>
        <span>{highLabel}</span>
      </div>
      {hasLost && (
        <div className="flex items-center gap-2">
          <span className="size-4 rounded-xs bg-heat-3" style={HATCH_STYLE} aria-hidden />
          <span>Lost to unavailable equipment</span>
        </div>
      )}
      {hasGap && (
        <div className="flex items-center gap-2">
          <span className="size-4 rounded-xs border border-dashed border-foreground/45" aria-hidden />
          <span>{gapLabel}</span>
        </div>
      )}
    </div>
  );
}
