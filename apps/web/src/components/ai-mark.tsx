import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

// Three slanted bars in the brand's lean, the cadence of a set, with a spark above them for the coach.
// Idle it is a still mark; active the bars rise in turn like reps and the spark breathes. The `tempo`
// variant drops the spark for work that is not the AI (saving, applying), so only the coach carries it.
const BARS = [
  { id: 'first', d: 'M4.2 21h3.4l2.4-11.5H6.6z', delay: '0ms', rest: 'scale-y-60' },
  { id: 'second', d: 'M9.8 21h3.4l2.4-14.5h-3.4z', delay: '150ms', rest: 'scale-y-80' },
  { id: 'third', d: 'M15.4 21h3.4l2.4-8.5h-3.4z', delay: '300ms', rest: 'scale-y-100' },
] as const;

interface AiMarkProps extends Omit<ComponentProps<'svg'>, 'viewBox'> {
  isActive?: boolean;
  variant?: 'ai' | 'tempo';
}

export function AiMark({ isActive, variant = 'ai', className, ...props }: AiMarkProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('ai-mark size-4 shrink-0 fill-current', className)} {...props}>
      {BARS.map((bar) => (
        <path
          key={bar.id}
          d={bar.d}
          data-part="bar"
          style={isActive ? { animationDelay: bar.delay } : undefined}
          className={cn(isActive ? 'animate-ai-bar' : bar.rest)}
        />
      ))}
      {variant === 'ai' && (
        <path
          d="M18.5 1.5l1.1 2.9 2.9 1.1-2.9 1.1-1.1 2.9-1.1-2.9-2.9-1.1 2.9-1.1z"
          data-part="spark"
          className={cn(isActive && 'animate-ai-spark')}
        />
      )}
    </svg>
  );
}
