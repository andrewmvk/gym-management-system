'use client';

import { useI18n } from '@/lib/i18n/i18n-provider';
import { cn } from '@/lib/utils';

const STEP_SWATCHES = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4', 'bg-heat-5'] as const;

export const HATCH_STYLE = {
  backgroundImage:
    'repeating-linear-gradient(135deg, transparent 0 2px, color-mix(in oklch, var(--foreground) 60%, transparent) 2px 4px)',
} as const;

export const INJURY_HATCH_STYLE = {
  backgroundImage:
    'repeating-linear-gradient(45deg, transparent 0 2px, color-mix(in oklch, var(--tape) 80%, transparent) 2px 4px)',
} as const;

interface MuscleLegendProps {
  lowLabel?: string;
  highLabel?: string;
  hasLost?: boolean;
  hasGap?: boolean;
  hasInjury?: boolean;
  gapLabel?: string;
  className?: string;
}

export function MuscleLegend({
  lowLabel,
  highLabel,
  hasLost,
  hasGap,
  hasInjury,
  gapLabel,
  className,
}: MuscleLegendProps) {
  const { t } = useI18n();

  return (
    <div className={cn('flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground', className)}>
      <div className="flex items-center gap-2">
        <span>{lowLabel ?? t('Less')}</span>
        <span className="flex gap-0.5" aria-hidden>
          {STEP_SWATCHES.map((swatch) => (
            <span key={swatch} className={cn('h-3 w-5 -skew-x-12 rounded-xs', swatch)} />
          ))}
        </span>
        <span>{highLabel ?? t('More')}</span>
      </div>
      {hasLost && (
        <div className="flex items-center gap-2">
          <span className="size-4 rounded-xs bg-heat-3" style={HATCH_STYLE} aria-hidden />
          <span>{t('Lost to equipment out of service')}</span>
        </div>
      )}
      {hasInjury && (
        <div className="flex items-center gap-2">
          <span className="size-4 rounded-xs border-2 border-tape bg-heat-1" style={INJURY_HATCH_STYLE} aria-hidden />
          <span>{t('Injury you reported')}</span>
        </div>
      )}
      {hasGap && (
        <div className="flex items-center gap-2">
          <span className="size-4 rounded-xs border border-dashed border-foreground/45" aria-hidden />
          <span>{gapLabel ?? t('No exercise trains it')}</span>
        </div>
      )}
    </div>
  );
}
