'use client';

import { useI18n } from '@/lib/i18n/i18n-provider';
import { cn } from '@/lib/utils';

interface StepperProps {
  steps: readonly string[];
  current: number;
  className?: string;
}

// The stations of a fixed sequence: done is solid cobalt, current is tape, upcoming is dashed.
export function Stepper({ steps, current, className }: StepperProps) {
  const { t, tn } = useI18n();

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <p className="flex items-baseline justify-between gap-2 font-display text-sm font-semibold tracking-widest text-muted-foreground uppercase">
        <span>
          {tn('Step {current} of {total}', {
            current: <span className="numerals text-base text-foreground">{current + 1}</span>,
            total: <span className="numerals text-base text-foreground">{steps.length}</span>,
          })}
        </span>
        <span className="text-foreground">{steps[current]}</span>
      </p>
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step, index) => (
          <li key={step} aria-current={index === current ? 'step' : undefined}>
            <span className="sr-only">
              {step}: {index < current ? t('done') : index === current ? t('current step') : t('upcoming')}
            </span>
            <span
              aria-hidden
              className={cn(
                'block h-1.5 -skew-x-12 rounded-xs transition-colors duration-500',
                index < current && 'bg-primary',
                index === current && 'bg-tape',
                index > current && 'border border-dashed border-foreground/30',
              )}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
