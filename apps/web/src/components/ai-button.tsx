import type { ComponentProps } from 'react';
import { AiMark } from '@/components/ai-mark';
import { Button } from '@/components/ui/button';

interface AiButtonProps extends ComponentProps<typeof Button> {
  isPending?: boolean;
  pendingLabel: string;
  // `ai` is for what the coach does; `tempo` is the same bars without the spark, for other work that takes a moment.
  mark?: 'ai' | 'tempo';
}

// A button whose action takes time says so twice: its label changes to what is happening and its mark moves.
// Both the label and the mark are announced as one status, so nothing relies on the animation alone.
export function AiButton({
  isPending,
  pendingLabel,
  mark = 'ai',
  disabled,
  children,
  type = 'button',
  ...props
}: AiButtonProps) {
  return (
    <Button type={type} disabled={isPending || disabled} aria-busy={isPending} {...props}>
      <AiMark variant={mark} isActive={isPending} data-icon="inline-start" />
      {isPending ? pendingLabel : children}
    </Button>
  );
}
