'use client';

import type { ProposalRow } from '@cadence/shared/schemas/coach';
import { useQuery } from '@tanstack/react-query';
import { XIcon } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useEffect, useRef } from 'react';
import { useAppAbility } from '@/abilities';
import { CoachComposer } from '@/app/(member)/coach/coach-composer';
import { useCoach } from '@/app/(member)/coach/coach-context';
import { CoachMessage } from '@/app/(member)/coach/coach-message';
import { DraftBar } from '@/app/(member)/coach/draft-bar';
import { ProposalPanel } from '@/app/(member)/coach/proposal-panel';
import { useCoachChat } from '@/app/(member)/coach/use-coach-chat';
import { useCoachDraft } from '@/app/(member)/coach/use-coach-draft';
import { isDockedViewport } from '@/app/(member)/coach/viewport';
import { AiMark } from '@/components/ai-mark';
import { Button } from '@/components/ui/button';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

const STARTERS = ['My left knee hurts today', 'I only have 30 minutes', 'I started a new medication'];

// A toast, or a confirmation dialog opening on top of the chat, is not the member leaving it.
function isOverlayTarget(target: EventTarget | null) {
  return target instanceof Element && target.closest('[data-sonner-toast], [role="alertdialog"]') !== null;
}

// FR-25/FR-26: the coach is the member's way of talking to their plan. What it proposes shows up as a card in
// the thread and opens beside the chat to be edited; nothing it says reaches the database until the member
// applies it, and the chat itself is not saved.
export function CoachPanel() {
  const trpc = useTRPC();
  const ability = useAppAbility();
  const coach = useCoach();
  const draftApi = useCoachDraft();
  const chat = useCoachChat({ onProposal: draftApi.receiveProposal });
  const todayQuery = useQuery({ ...trpc.plans.getToday.queryOptions(), enabled: coach.isOpen });
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const latest = useRef({ chat, draftApi, coach });
  latest.current = { chat, draftApi, coach };

  const { request } = coach;
  useEffect(() => {
    if (!request) return;
    const { chat: activeChat, draftApi: activeDraft, coach: activeCoach } = latest.current;
    activeCoach.consumeRequest(request.id);
    if (request.message) activeChat.send(request.message, request.mentions, activeDraft.sendableDraft);
    else for (const chip of request.mentions) activeCoach.addMention(chip);
  }, [request]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: new messages and a growing reply are the triggers, not values read inside.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat.messages]);

  if (!ability.can('create', 'ProfileEvent')) return null;

  const lastRequest = [...chat.messages].reverse().find((message) => message.role === 'member')?.text ?? '';
  const lastMessageId = chat.messages.at(-1)?.id;
  const planExercises = todayQuery.data?.exercises ?? [];
  const starters = planExercises[0] ? [`How do I do ${planExercises[0].exerciseName}?`, ...STARTERS] : STARTERS;
  const openDraft = draftApi.openDraft;
  const isDocked = openDraft !== null && draftApi.isPanelOpen;

  function sendTyped(text: string) {
    chat.send(text, coach.mentions, draftApi.sendableDraft);
    coach.clearMentions();
  }

  // On a phone the proposal covers the chat, so pointing at something or sending a message returns to it.
  function showChat() {
    if (!isDockedViewport()) draftApi.setIsPanelOpen(false);
  }

  function mentionRow(row: ProposalRow) {
    coach.addMention({ type: 'exercise', exerciseId: row.exerciseId, name: row.name });
    showChat();
    inputRef.current?.focus();
  }

  function askSaferSwap(row: ProposalRow) {
    chat.send(
      `Swap ${row.name} for something safer for me`,
      [{ type: 'exercise', exerciseId: row.exerciseId, name: row.name }],
      draftApi.sendableDraft,
    );
    showChat();
  }

  return (
    <>
      <Dialog.Root open={coach.isOpen} onOpenChange={coach.setIsOpen}>
        <Dialog.Trigger asChild>
          <Button
            type="button"
            size="lg"
            className="fixed right-4 bottom-4 z-40 rounded-full px-5 shadow-fab sm:right-6 sm:bottom-6"
          >
            <AiMark className="size-5" data-icon="inline-start" />
            Coach
          </Button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 duration-300 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 sm:bg-black/20" />
          <Dialog.Content
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              inputRef.current?.focus();
            }}
            onInteractOutside={(event) => {
              if (isOverlayTarget(event.target)) event.preventDefault();
            }}
            className={cn(
              'fixed inset-0 z-50 flex flex-col overflow-hidden bg-card outline-none duration-300 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-4 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-4 sm:inset-auto sm:right-6 sm:bottom-24 sm:h-144 sm:max-h-[calc(100dvh-8rem)] sm:w-96 sm:flex-row sm:rounded-lg sm:border sm:shadow-overlay',
              isDocked && 'lg:w-3xl',
            )}
          >
            <div className="flex min-h-0 flex-1 flex-col sm:w-96 sm:flex-none lg:order-last">
              <div className="flex items-start gap-3 bg-kit px-5 pt-4 pb-3 text-kit-foreground">
                <div className="flex-1">
                  <Dialog.Title className="flex items-center gap-2 font-display text-xl font-bold tracking-wide uppercase">
                    <AiMark className="size-5" />
                    AI coach
                  </Dialog.Title>
                  <Dialog.Description className="text-xs text-kit-muted">
                    Facts you share are remembered once you save them. The chat itself isn&apos;t saved.
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="-mt-1 -mr-3 size-11 text-kit-foreground hover:bg-white/10"
                  >
                    <XIcon className="size-5" />
                    <span className="sr-only">Close chat</span>
                  </Button>
                </Dialog.Close>
              </div>

              <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4" aria-live="polite">
                {chat.messages.length === 0 && (
                  <div className="flex flex-col gap-3 py-2">
                    <p className="text-sm text-muted-foreground">
                      Ask about your plan, report an injury, point at an exercise or a muscle, or share an update.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {starters.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => sendTyped(prompt)}
                          className="min-h-11 rounded-full border border-input px-4 text-sm transition-colors outline-none hover:border-primary/60 hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/45"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chat.messages.map((message) => (
                  <CoachMessage
                    key={message.id}
                    message={message}
                    draftApi={draftApi}
                    lastRequest={lastRequest}
                    isLatest={message.id === lastMessageId}
                    isStreaming={chat.isStreaming}
                    onQuickReply={(reply) => chat.send(reply, [], draftApi.sendableDraft)}
                    onRetry={() => chat.retry(draftApi.sendableDraft)}
                  />
                ))}
              </div>

              <DraftBar api={draftApi} />

              <CoachComposer
                mentions={coach.mentions}
                isStreaming={chat.isStreaming}
                inputRef={inputRef}
                onRemoveMention={coach.removeMention}
                onSend={sendTyped}
              />
            </div>

            {isDocked && openDraft && (
              <ProposalPanel
                draft={openDraft}
                api={draftApi}
                mentions={coach.mentions}
                onMention={mentionRow}
                onAskSaferSwap={askSaferSwap}
                className="absolute inset-0 z-10 animate-block-in lg:static lg:order-first lg:w-96 lg:animate-none lg:border-r"
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {draftApi.overwriteDialog}
    </>
  );
}
