'use client';

import type { CoachBlock, CoachDraft, CoachStreamEvent, HistoryTurn, Mention } from '@cadence/shared/schemas/coach';
import { buildHistory } from '@cadence/shared/schemas/coach-history';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type { MentionChip } from '@/app/(member)/coach/coach-context';
import type { PlanProposalBlock } from '@/app/(member)/coach/use-coach-draft';
import { useStreamAction } from '@/hooks/use-stream-action';
import { useTRPC, useTRPCClient } from '@/lib/trpc';

export interface CoachMessage {
  id: string;
  role: 'member' | 'assistant';
  text: string;
  blocks: CoachBlock[];
  mentions: MentionChip[];
  // Only an assistant reply streams: it is done once the stream ends, or failed when it broke off.
  status: 'streaming' | 'done' | 'error';
}

interface SendInput {
  text: string;
  mentions: MentionChip[];
  draft: CoachDraft | undefined;
  history: HistoryTurn[];
  assistantId: string;
}

interface UseCoachChatOptions {
  onProposal: (block: PlanProposalBlock, request: string) => void;
  // The day of the plan on screen, so the coach reads what the member points at against that day.
  viewedDate: string | null;
}

// The coach receives the ids only; the name on an exercise chip is for the screen.
function toApiMention(chip: MentionChip): Mention {
  if (chip.type === 'exercise') return { type: 'exercise', exerciseId: chip.exerciseId };
  if (chip.type === 'muscle') return { type: 'muscle', muscle: chip.muscle };
  if (chip.type === 'group') return { type: 'group', group: chip.group };
  return { type: 'distribution' };
}

const FAILED_MESSAGE = "We couldn't finish that reply. Nothing was changed. Try again.";

// FR-25/FR-26: messages live only in this hook's state, so a reload forgets them. Durability lives in the
// facts the coach asks the member to confirm and in the plans the member applies.
export function useCoachChat({ onProposal, viewedDate }: UseCoachChatOptions) {
  const trpc = useTRPC();
  const client = useTRPCClient();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const lastSentRef = useRef<{ text: string; mentions: MentionChip[] } | null>(null);
  const onProposalRef = useRef(onProposal);
  onProposalRef.current = onProposal;
  const viewedDateRef = useRef(viewedDate);
  viewedDateRef.current = viewedDate;

  const patchAssistant = (id: string, patch: (message: CoachMessage) => CoachMessage) =>
    setMessages((current) => current.map((message) => (message.id === id ? patch(message) : message)));

  const stream = useStreamAction<SendInput, CoachStreamEvent>({
    run: ({ text, mentions, draft, history }) =>
      client.chat.send.mutate({
        message: text,
        history,
        mentions: mentions.map(toApiMention),
        draft,
        date: viewedDateRef.current ?? undefined,
      }),
    onEvent: (event, input) => {
      if (event.type === 'text') {
        patchAssistant(input.assistantId, (message) => ({ ...message, text: message.text + event.delta }));
        return;
      }
      patchAssistant(input.assistantId, (message) => ({ ...message, blocks: [...message.blocks, event.block] }));
      if (event.block.type === 'plan_proposal') onProposalRef.current(event.block, input.text);
      if (event.block.type === 'facts') {
        queryClient.invalidateQueries({ queryKey: trpc.profile.listMine.queryKey() });
      }
    },
    onSuccess: (input) => patchAssistant(input.assistantId, (message) => ({ ...message, status: 'done' })),
    onError: (_error, input) => {
      patchAssistant(input.assistantId, (message) => ({ ...message, status: 'error' }));
      toast.error(FAILED_MESSAGE);
    },
  });

  // `earlier` is the conversation the coach is shown with this message; a retry passes it without the reply
  // that failed, so the coach sees the same conversation the member does.
  function send(
    text: string,
    mentions: MentionChip[],
    draft: CoachDraft | undefined,
    earlier: readonly CoachMessage[] = messages,
  ) {
    const message = text.trim();
    if (!message || stream.isPending) return;
    const assistantId = crypto.randomUUID();
    lastSentRef.current = { text: message, mentions };
    setMessages([
      ...earlier,
      { id: crypto.randomUUID(), role: 'member', text: message, blocks: [], mentions, status: 'done' },
      { id: assistantId, role: 'assistant', text: '', blocks: [], mentions: [], status: 'streaming' },
    ]);
    stream.start({ text: message, mentions, draft, history: buildHistory(earlier), assistantId });
  }

  function retry(draft: CoachDraft | undefined) {
    const last = lastSentRef.current;
    if (!last || stream.isPending) return;
    send(last.text, last.mentions, draft, messages.slice(0, -2));
  }

  return { messages, send, retry, isStreaming: stream.isPending };
}
