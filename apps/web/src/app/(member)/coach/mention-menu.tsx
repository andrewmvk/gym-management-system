'use client';

import { CheckIcon, MousePointerClickIcon } from 'lucide-react';
import { Fragment, useEffect, useRef } from 'react';
import { mentionKey } from '@/app/(member)/coach/coach-context';
import type { MentionOption } from '@/app/(member)/coach/mention-options';
import { cn } from '@/lib/utils';

export type MentionMenuEntry = { kind: 'point' } | { kind: 'option'; option: MentionOption };

interface MentionMenuProps {
  id: string;
  entries: readonly MentionMenuEntry[];
  activeIndex: number;
  mentionedKeys: ReadonlySet<string>;
  query: string;
  onPick: (entry: MentionMenuEntry) => void;
  onActiveChange: (index: number) => void;
  className?: string;
}

// The list that opens when the member types "@" in the message box: what the coach can be pointed at, narrowed by
// what follows the "@". The first row hands the choice to the page itself. No shadcn component fits (Command has
// its own input, and here the input is the message box), so it is a plain list of buttons driven from the textarea.
export function MentionMenu({
  id,
  entries,
  activeIndex,
  mentionedKeys,
  query,
  onPick,
  onActiveChange,
  className,
}: MentionMenuProps) {
  const activeRef = useRef<HTMLButtonElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: moving the highlighted row is the trigger, nothing is read inside.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <div
      className={cn(
        'max-h-64 overflow-y-auto overscroll-contain rounded-md border bg-card py-1 shadow-popover',
        className,
      )}
    >
      {entries.length === 0 ? (
        <p className="px-3 py-3 text-sm text-muted-foreground">
          Nothing called &ldquo;{query}&rdquo;. Try an exercise, a muscle or a group like legs.
        </p>
      ) : (
        <ul id={id} aria-label="Point the coach at">
          {entries.map((entry, index) => {
            const isActive = index === activeIndex;
            const previous = entries[index - 1];
            const section = entry.kind === 'option' ? entry.option.section : null;
            const previousSection = previous?.kind === 'option' ? previous.option.section : null;
            const isNewSection = section !== null && section !== previousSection;
            const isMentioned = entry.kind === 'option' && mentionedKeys.has(mentionKey(entry.option.chip));
            return (
              <Fragment key={entry.kind === 'point' ? 'point' : mentionKey(entry.option.chip)}>
                {isNewSection && entry.kind === 'option' && (
                  <li className="px-3 pt-2 pb-1 font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                    {entry.option.sectionLabel}
                  </li>
                )}
                <li className={cn(entry.kind === 'point' && 'border-b')}>
                  <button
                    type="button"
                    ref={isActive ? activeRef : undefined}
                    aria-current={isActive}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => onActiveChange(index)}
                    onClick={() => onPick(entry)}
                    className={cn(
                      'flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/45 focus-visible:ring-inset',
                      isActive && 'bg-accent',
                    )}
                  >
                    {entry.kind === 'point' ? (
                      <>
                        <MousePointerClickIcon className="size-4 shrink-0 text-primary" aria-hidden />
                        <span className="flex min-w-0 flex-col">
                          <span className="font-semibold">Pick from the page</span>
                          <span className="text-xs text-muted-foreground">Tap what you want to ask about</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="min-w-0 flex-1 truncate font-semibold">{entry.option.label}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">{entry.option.hint}</span>
                        {isMentioned && <CheckIcon className="size-4 shrink-0 text-primary" aria-label="Added" />}
                      </>
                    )}
                  </button>
                </li>
              </Fragment>
            );
          })}
        </ul>
      )}
    </div>
  );
}
