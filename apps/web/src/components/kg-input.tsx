import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const DECIMAL = /^\d{0,4}([.,]\d?)?$/;

interface KgInputProps extends Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'type' | 'inputMode'> {
  value: string;
  onValueChange: (value: string) => void;
}

// A weight field: only a number can be typed, and the unit is always drawn inside the field, never part of the
// value, so the same box reads "20 kg" whether it holds a number or nothing yet.
export function KgInput({ value, onValueChange, className, ...props }: KgInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        value={value}
        onChange={(event) => DECIMAL.test(event.target.value) && onValueChange(event.target.value)}
        className="numerals pr-9 text-right text-lg"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-muted-foreground"
      >
        kg
      </span>
    </div>
  );
}
