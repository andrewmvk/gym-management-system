'use client';

import { StickyNoteIcon } from 'lucide-react';
import { type PointerEvent, useEffect, useRef, useState } from 'react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const HOVER_CLOSE_DELAY_MS = 120;

// hover: a mouse rests on the icon and the note follows it away again. pinned: a click, a tap or Enter keeps it
// open until the next click, Escape or a press elsewhere, which is the only way to read it on a touch screen.
type NoteMode = 'closed' | 'hover' | 'pinned';

interface ExerciseNoteProps {
  name: string;
  notes: string;
  className?: string;
}

// A note on one exercise, behind an icon so the row keeps its rhythm. A mouse peeks at it by hovering; a tap,
// a click or the keyboard opens it and keeps it open. It is a popover the component opens itself because
// neither a hover card (no touch, no keyboard) nor a tooltip (the member cannot select or keep it) fits both.
export function ExerciseNote({ name, notes, className }: ExerciseNoteProps) {
  const [mode, setMode] = useState<NoteMode>('closed');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const isMouse = (event: PointerEvent) => event.pointerType === 'mouse';

  function keepOpen(event: PointerEvent) {
    if (!isMouse(event)) return;
    clearTimeout(closeTimer.current);
    setMode((current) => (current === 'closed' ? 'hover' : current));
  }

  // The gap between the icon and the note is crossed within the delay, so the pointer can reach the note.
  function letGo(event: PointerEvent) {
    if (!isMouse(event)) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(
      () => setMode((current) => (current === 'hover' ? 'closed' : current)),
      HOVER_CLOSE_DELAY_MS,
    );
  }

  return (
    <Popover open={mode !== 'closed'} onOpenChange={(isOpen) => !isOpen && setMode('closed')}>
      <PopoverAnchor asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label={`Note for ${name}`}
          aria-haspopup="dialog"
          aria-expanded={mode !== 'closed'}
          onClick={() => setMode((current) => (current === 'pinned' ? 'closed' : 'pinned'))}
          onPointerEnter={keepOpen}
          onPointerLeave={letGo}
          className={cn(
            'inline-flex size-7 shrink-0 items-center justify-center rounded-sm bg-accent text-accent-foreground transition-colors outline-none hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/45 aria-expanded:bg-primary aria-expanded:text-primary-foreground',
            className,
          )}
        >
          <StickyNoteIcon className="size-4" aria-hidden />
        </button>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        collisionPadding={16}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if (event.target instanceof Node && triggerRef.current?.contains(event.target)) event.preventDefault();
        }}
        onPointerEnter={keepOpen}
        onPointerLeave={letGo}
        className="w-72 max-w-[calc(100vw-2rem)] text-sm text-pretty"
      >
        <p className="whitespace-pre-line">
          <span className="font-semibold">Note: </span>
          {notes}
        </p>
      </PopoverContent>
    </Popover>
  );
}
