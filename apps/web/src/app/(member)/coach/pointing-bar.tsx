'use client';

import { useEffect } from 'react';
import { useCoach } from '@/app/(member)/coach/coach-context';
import { MentionChips } from '@/app/(member)/coach/mention-chips';
import { Button } from '@/components/ui/button';

// While the member points the coach at the page, the chat is closed and this is all that stays: what has been
// picked so far and the way back. The dashed frames on the page are the invitation; this bar says what to do.
export function PointingBar() {
  const { isPointing, mentions, removeMention, stopPointing } = useCoach();

  useEffect(() => {
    if (!isPointing) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') stopPointing();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPointing, stopPointing]);

  if (!isPointing) return null;

  return (
    <section
      aria-label="Pointing the coach at the page"
      className="fixed right-4 bottom-4 left-4 z-40 flex animate-block-in flex-col gap-3 rounded-lg bg-kit p-4 text-kit-foreground shadow-popover sm:right-auto sm:bottom-6 sm:left-1/2 sm:w-full sm:max-w-xl sm:-translate-x-1/2"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl leading-none font-bold tracking-wide uppercase">Pick what to ask about</p>
          <p className="mt-1 text-sm text-kit-muted">
            Tap an exercise, a muscle or a muscle group on the page. Tap again to take it off.
          </p>
        </div>
        <Button
          type="button"
          onClick={stopPointing}
          className="shrink-0 bg-kit-foreground text-kit hover:bg-kit-foreground/90"
        >
          {mentions.length > 0 ? (
            <>
              Back to chat
              <span className="numerals text-lg leading-none">{mentions.length}</span>
            </>
          ) : (
            'Back to chat'
          )}
        </Button>
      </div>
      <MentionChips chips={mentions} onRemove={removeMention} />
    </section>
  );
}
