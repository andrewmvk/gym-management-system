'use client';

import { SendHorizontalIcon } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, type RefObject, useState } from 'react';
import type { MentionChip } from '@/app/(member)/coach/coach-context';
import { MentionChips } from '@/app/(member)/coach/mention-chips';
import { AiMark } from '@/components/ai-mark';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface CoachComposerProps {
  mentions: readonly MentionChip[];
  isStreaming: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onRemoveMention: (key: string) => void;
  onSend: (text: string) => void;
}

export function CoachComposer({ mentions, isStreaming, inputRef, onRemoveMention, onSend }: CoachComposerProps) {
  const [draft, setDraft] = useState('');

  function submit() {
    const text = draft.trim();
    if (!text || isStreaming) return;
    onSend(text);
    setDraft('');
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t bg-card p-3">
      <MentionChips chips={mentions} onRemove={onRemoveMention} />
      <div className="flex items-end gap-2">
        <Textarea
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mentions.length > 0 ? 'What about it?' : 'Message your coach...'}
          aria-label="Message your coach"
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
