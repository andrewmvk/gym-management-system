'use client';

import { useSlidingIndicator } from '@/hooks/use-sliding-indicator';
import { cn } from '@/lib/utils';

interface SegmentedFilterProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string; count?: number }[];
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedFilter<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: SegmentedFilterProps<T>) {
  const ref = useSlidingIndicator<HTMLDivElement>('[role="radio"][aria-checked="true"]');

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      className={cn('group/segmented relative inline-flex rounded-md border bg-muted', className)}
    >
      {/* The chosen option's card glides under the labels; the options only change their text color. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-(--slide-w) translate-x-(--slide-x) rounded-sm bg-card shadow-raised transition-[translate,width] duration-300 ease-(--ease-out-expo) group-data-sliding/segmented:block motion-reduce:transition-none"
      />
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-sm px-3 font-display text-sm font-semibold tracking-wider whitespace-nowrap uppercase transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/45',
              isActive
                ? 'bg-card text-foreground shadow-raised group-data-sliding/segmented:bg-transparent group-data-sliding/segmented:shadow-none'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span key={option.count} className="numerals inline-block animate-tick text-base text-muted-foreground">
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
