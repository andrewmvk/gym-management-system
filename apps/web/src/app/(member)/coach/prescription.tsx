import { formatWeight } from '@/lib/format';
import { cn } from '@/lib/utils';

interface PrescriptionProps {
  sets: number;
  reps: number;
  load?: number | string | null;
  isStruck?: boolean;
  className?: string;
}

// Sets x reps (with the weight beside it) as jersey numerals, the way a plan row shows them.
export function Prescription({ sets, reps, load, isStruck, className }: PrescriptionProps) {
  return (
    <span
      className={cn(
        'numerals inline-flex items-baseline gap-0.5 text-2xl leading-none font-bold',
        isStruck && 'text-muted-foreground line-through decoration-2',
        className,
      )}
    >
      {sets}
      <span className="px-0.5 text-muted-foreground">&times;</span>
      {reps}
      {load ? <span className="pl-2 text-sm font-semibold text-muted-foreground">{formatWeight(load)}</span> : null}
    </span>
  );
}
