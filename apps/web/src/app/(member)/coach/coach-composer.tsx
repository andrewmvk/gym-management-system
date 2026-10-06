'use client';

import { AtSignIcon, SendHorizontalIcon } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, type RefObject, useEffect, useId, useState } from 'react';
import { type MentionChip, mentionKey } from '@/app/(member)/coach/coach-context';
import { MentionChips } from '@/app/(member)/coach/mention-chips';
import { MentionMenu, type MentionMenuEntry } from '@/app/(member)/coach/mention-menu';
import { filterMentionOptions, type MentionOption, suggestionsFor } from '@/app/(member)/coach/mention-options';
import { AiMark } from '@/components/ai-mark';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface CoachComposerProps {
  mentions: readonly MentionChip[];
  isStreaming: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  // The message being written lives above, so it survives the chat closing while the member points at the page.
  draft: string;
  onDraftChange: (draft: string) => void;
  options: readonly MentionOption[];
  // Whether the screen behind the chat has things to point at; when it does the menu offers to pick from it.
  canPoint: boolean;
  onPoint: () => void;
  onMention: (chip: MentionChip) => void;
  onRemoveMention: (key: string) => void;
  onSend: (text: string) => void;
  onMenuOpenChange: (isOpen: boolean) => void;
}

interface MenuState {
  // Where the "@" sits in the message, and what has been typed after it.
  start: number;
  query: string;
}

function findTrigger(value: string, caret: number): MenuState | null {
  const match = /(^|\s)@([^\s@]*)$/.exec(value.slice(0, caret));
  return match ? { start: caret - (match[2]?.length ?? 0) - 1, query: match[2] ?? '' } : null;
}

// Pointing is one idea with two ways in: type "@" (or press the @ button) for a list, or choose "Pick from the
// page" in that list to tap things on the screen itself. Either way the member ends with chips they can see and
// a message they send themselves; nothing is sent until they do.
export function CoachComposer({
  mentions,
  isStreaming,
  inputRef,
  draft,
  onDraftChange,
  options,
  canPoint,
  onPoint,
  onMention,
  onRemoveMention,
  onSend,
  onMenuOpenChange,
}: CoachComposerProps) {
  const listId = useId();
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const mentionedKeys = new Set(mentions.map(mentionKey));
  const matches = menu ? filterMentionOptions(options, menu.query) : [];
  const entries: MentionMenuEntry[] = menu
    ? [
        ...(canPoint && menu.query === '' ? [{ kind: 'point' as const }] : []),
        ...matches.map((option) => ({ kind: 'option' as const, option })),
      ]
    : [];
  const isMenuOpen = menu !== null;

  useEffect(() => onMenuOpenChange(isMenuOpen), [isMenuOpen, onMenuOpenChange]);

  const lastMention = mentions.at(-1);
  const suggestions = lastMention && !draft.trim() && !menu ? suggestionsFor(lastMention) : [];

  function submit() {
    const text = draft.trim();
    if (!text || isStreaming) return;
    onSend(text);
    onDraftChange('');
    setMenu(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function update(value: string, caret: number) {
    const next = findTrigger(value, caret);
    setMenu(next);
    if (next?.query !== menu?.query) setActiveIndex(0);
  }

  function placeCaret(position: number) {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(position, position);
    });
  }

  function pick(entry: MentionMenuEntry | undefined) {
    if (!menu || !entry) return;
    const before = draft.slice(0, menu.start);
    const after = draft.slice(menu.start + 1 + menu.query.length);
    const joined = before.endsWith(' ') && after.startsWith(' ') ? `${before}${after.slice(1)}` : `${before}${after}`;
    onDraftChange(joined);
    setMenu(null);
    if (entry.kind === 'point') onPoint();
    else onMention(entry.option.chip);
    placeCaret(before.length);
  }

  function toggleMenu() {
    if (menu) {
      setMenu(null);
      return;
    }
    const caret = inputRef.current?.selectionStart ?? draft.length;
    const before = draft.slice(0, caret);
    const insert = before.length > 0 && !/\s$/.test(before) ? ' @' : '@';
    onDraftChange(`${before}${insert}${draft.slice(caret)}`);
    setMenu({ start: caret + insert.length - 1, query: '' });
    setActiveIndex(0);
    placeCaret(caret + insert.length);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (menu && entries.length > 0) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex((current) => (current + step + entries.length) % entries.length);
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        pick(entries[activeIndex]);
        return;
      }
    }
    if (menu && event.key === 'Escape') {
      event.preventDefault();
      setMenu(null);
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex flex-col gap-2 border-t bg-card p-3">
      {menu && (
        <MentionMenu
          id={listId}
          entries={entries}
          activeIndex={activeIndex}
          mentionedKeys={mentionedKeys}
          query={menu.query}
          onPick={pick}
          onActiveChange={setActiveIndex}
          className="absolute inset-x-3 bottom-full mb-1"
        />
      )}
      <MentionChips chips={mentions} onRemove={onRemoveMention} />
      {suggestions.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Ways to ask">
          {suggestions.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                onClick={() => {
                  onDraftChange(suggestion);
                  placeCaret(suggestion.length);
                }}
                className="min-h-8 rounded-full border border-input px-3 text-left text-xs transition-colors outline-none hover:border-primary/60 hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/45"
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-11"
          aria-expanded={isMenuOpen}
          aria-controls={isMenuOpen ? listId : undefined}
          onClick={toggleMenu}
        >
          <AtSignIcon className="size-5" />
          <span className="sr-only">Point the coach at an exercise, muscle or group</span>
        </Button>
        <Textarea
          ref={inputRef}
          value={draft}
          onChange={(event) => {
            onDraftChange(event.target.value);
            update(event.target.value, event.target.selectionStart);
          }}
          onSelect={(event) => update(event.currentTarget.value, event.currentTarget.selectionStart)}
          onKeyDown={handleKeyDown}
          placeholder={mentions.length > 0 ? 'What about it?' : 'Ask your coach, or type @'}
          aria-label="Message your coach"
          aria-autocomplete="list"
          aria-controls={isMenuOpen ? listId : undefined}
          maxLength={2000}
          rows={1}
          className="max-h-32 min-h-11 flex-1 resize-none py-2.5"
        />
        <Button type="submit" size="icon" className="size-11" disabled={isStreaming || !draft.trim()}>
          {isStreaming ? <AiMark isActive className="size-5" /> : <SendHorizontalIcon className="size-5" />}
          <span className="sr-only">{isStreaming ? 'Coach is replying' : 'Send'}</span>
        </Button>
      </div>
    </form>
  );
}
