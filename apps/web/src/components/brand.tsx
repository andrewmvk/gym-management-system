import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('size-6 shrink-0', className)}>
      <path d="M8.5 3h5L8 21H3z" fill="var(--stripe)" />
      <path d="M16.5 3h5L16 21h-5z" fill="var(--tape)" />
    </svg>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <BrandMark />
      <span className="font-display text-2xl leading-none font-extrabold tracking-wider uppercase italic">
        Cadence
      </span>
    </span>
  );
}
