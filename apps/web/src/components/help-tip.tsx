import { CircleHelpIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HelpTipProps {
  text: string;
  className?: string;
}

// Explains a label without a visible second line. The same text is the accessible name, and nothing a
// reader needs to act on belongs here, because a tap on a phone may not open the bubble.
export function HelpTip({ text, className }: HelpTipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={text}
          className={cn(
            'inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/45',
            className,
          )}
        >
          <CircleHelpIcon className="size-4" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}
