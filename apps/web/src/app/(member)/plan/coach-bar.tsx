'use client';

import { XIcon } from 'lucide-react';
import { useCoach } from '@/app/(member)/coach/coach-context';
import { AiButton } from '@/components/ai-button';
import { Button } from '@/components/ui/button';

// The only coach control on the plan screen, and only while an exercise is picked: there are no buttons
// on the rows themselves. It leaves the right corner free for the floating Coach button.
export function CoachBar() {
  const { selection, setSelection, ask } = useCoach();
  if (!selection) return null;

  return (
    <section
      aria-label="Ask the coach about this exercise"
      className="fixed right-24 bottom-4 left-4 z-30 flex animate-block-in items-center gap-2 rounded-lg border bg-card py-2 pr-2 pl-4 shadow-popover sm:right-auto sm:bottom-6 sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2"
    >
      <p className="min-w-0 flex-1 truncate font-display text-lg font-bold tracking-wide uppercase">{selection.name}</p>
      <AiButton
        size="sm"
        pendingLabel="Asking..."
        onClick={() =>
          ask({ mentions: [{ type: 'exercise', exerciseId: selection.exerciseId, name: selection.name }] })
        }
      >
        Ask coach
      </AiButton>
      <Button type="button" variant="ghost" size="icon-sm" onClick={() => setSelection(null)}>
        <XIcon className="size-4" />
        <span className="sr-only">Clear selection</span>
      </Button>
    </section>
  );
}
