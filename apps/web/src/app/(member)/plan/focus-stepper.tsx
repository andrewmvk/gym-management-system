import { FOCUS_BIAS_LABELS, FOCUS_BIASES, type MuscleId, muscleLabel } from '@cadence/shared/schemas/muscles';
import { cn } from '@/lib/utils';

interface FocusStepperProps {
  muscle: MuscleId;
  value: number;
  onChange: (bias: number) => void;
  disabled?: boolean;
}

// Five slanted segments centered on normal. The segments between normal and the chosen level fill in,
// so the bar reads as "how far from normal" at a glance.
function isFilled(segment: number, value: number) {
  if (segment === 0) return true;
  return value > 0 ? segment > 0 && segment <= value : segment < 0 && segment >= value;
}

export function FocusStepper({ muscle, value, onChange, disabled }: FocusStepperProps) {
  return (
    <div className="flex flex-col gap-2">
      <fieldset className="grid grid-cols-5 gap-1">
        <legend className="sr-only">{`${muscleLabel(muscle)} focus`}</legend>
        {FOCUS_BIASES.map((segment) => (
          <button
            key={segment}
            type="button"
            aria-pressed={segment === value}
            aria-label={FOCUS_BIAS_LABELS[segment]}
            disabled={disabled}
            onClick={() => onChange(segment)}
            className={cn(
              'h-9 -skew-x-12 rounded-xs outline-none transition-colors duration-300 focus-visible:ring-3 focus-visible:ring-ring/45 disabled:opacity-45',
              isFilled(segment, value)
                ? value === 0
                  ? 'bg-foreground/60'
                  : 'bg-primary'
                : 'bg-muted hover:bg-foreground/15',
            )}
          />
        ))}
      </fieldset>
      <div className="flex justify-between font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        <span>Much less</span>
        <span>Normal</span>
        <span>Much more</span>
      </div>
    </div>
  );
}
