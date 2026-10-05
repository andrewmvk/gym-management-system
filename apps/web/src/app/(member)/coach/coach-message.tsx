'use client';

import { RotateCwIcon } from 'lucide-react';
import { CoachBlock } from '@/app/(member)/coach/coach-block';
import { MentionChips } from '@/app/(member)/coach/mention-chips';
import { QuickReplies } from '@/app/(member)/coach/quick-replies';
import type { CoachMessage as CoachMessageData } from '@/app/(member)/coach/use-coach-chat';
import type { CoachDraftApi } from '@/app/(member)/coach/use-coach-draft';
import { AiMark } from '@/components/ai-mark';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const OFFER_QUESTION =
  /\b(would you like|do you want|want me to|shall i|should i|can i)\b[^?]*\b(add|swap|replace|remove|include|change)\b[^?]*\?$/i;
const OFFER_REPLIES = ['Yes, do that', 'No, thanks'];

interface CoachMessageProps {
  message: CoachMessageData;
  draftApi: CoachDraftApi;
  lastRequest: string;
  isLatest: boolean;
  isStreaming: boolean;
  onQuickReply: (reply: string) => void;
  onRetry: () => void;
}

export function CoachMessage({
  message,
  draftApi,
  lastRequest,
  isLatest,
  isStreaming,
  onQuickReply,
  onRetry,
}: CoachMessageProps) {
  if (message.role === 'member') {
    return (
      <div className="flex max-w-5/6 flex-col items-end gap-1 self-end">
        <MentionChips chips={message.mentions} className="justify-end" />
        <p className="rounded-lg rounded-br-sm bg-primary px-3.5 py-2.5 text-sm text-pretty whitespace-pre-wrap text-primary-foreground">
          {message.text}
        </p>
      </div>
    );
  }

  const isWorking = message.status === 'streaming';
  const hasContent = message.text.length > 0 || message.blocks.length > 0;
  // The coach is told never to ask this without showing what it means, but when it does the member still gets
  // a one-tap answer instead of having to type one.
  const hasOpenOffer =
    isLatest &&
    message.status === 'done' &&
    OFFER_QUESTION.test(message.text.trim()) &&
    !message.blocks.some((block) => block.type === 'plan_proposal' || block.type === 'exercise_picker');

  return (
    <div className="flex flex-col gap-2 self-stretch">
      {message.text && (
        <p
          className={cn(
            'max-w-5/6 self-start rounded-lg rounded-bl-sm bg-muted px-3.5 py-2.5 text-sm text-pretty whitespace-pre-wrap',
          )}
        >
          {message.text}
        </p>
      )}
      {message.blocks.map((block) => (
        <CoachBlock
          key={block.id}
          block={block}
          draftApi={draftApi}
          lastRequest={lastRequest}
          isLatest={isLatest}
          isStreaming={isStreaming}
          onQuickReply={onQuickReply}
        />
      ))}
      {hasOpenOffer && <QuickReplies replies={OFFER_REPLIES} isDisabled={isStreaming} onPick={onQuickReply} />}
      {isWorking && (
        <p
          role="status"
          className="flex items-center gap-2 self-start rounded-lg rounded-bl-sm bg-muted px-3.5 py-2.5 text-sm text-muted-foreground"
        >
          <AiMark isActive className="size-5 text-primary" />
          {hasContent ? 'Still working on it...' : 'Your coach is working on it...'}
        </p>
      )}
      {message.status === 'error' && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-lg border-2 border-dashed border-destructive/50 px-3.5 py-3 text-sm"
        >
          <p className="text-pretty">
            {hasContent ? 'The reply broke off before it was finished.' : "Your coach couldn't reply."} Nothing was
            changed.
          </p>
          {isLatest && (
            <Button type="button" size="sm" variant="outline" className="w-fit" onClick={onRetry}>
              <RotateCwIcon data-icon="inline-start" />
              Try again
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
