import { cn } from '@/lib/utils';

interface StepperProps {
  steps: readonly string[];
  current: number;
  className?: string;
}

// The stations of a fixed sequence: done is solid cobalt, current is tape, upcoming is dashed.
export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <p className="flex items-baseline justify-between gap-2 font-display text-sm font-semibold tracking-widest text-muted-foreground uppercase">
        <span>
          Step <span className="numerals text-base text-foreground">{current + 1}</span> of{' '}
          <span className="numerals text-base text-foreground">{steps.length}</span>
        </span>
        <span className="text-foreground">{steps[current]}</span>
      </p>
      <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step, index) => (
          <li key={step} aria-current={index === current ? 'step' : undefined}>
            <span className="sr-only">
              {step}: {index < current ? 'done' : index === current ? 'current step' : 'upcoming'}
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
