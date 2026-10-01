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
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-md border bg-muted p-0.5', className)}>
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
              'inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-sm px-3 font-display text-sm font-semibold tracking-wider whitespace-nowrap uppercase transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/45',
              isActive ? 'bg-card text-foreground shadow-raised' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className="numerals text-base text-muted-foreground">{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
