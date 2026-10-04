'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarCheckIcon, MessageCircleIcon, SendHorizontalIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { Dialog } from 'radix-ui';
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAppAbility } from '@/abilities';
import { type PlanOverwriteConfirmation, PlanOverwriteDialog } from '@/app/(member)/plan/plan-overwrite-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatPlanDate } from '@/lib/format';
import { HEALTH_PROFILE_PATH } from '@/lib/routes';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface PlanAdjustment {
  date: string;
  instruction: string;
}

interface RememberedFact {
  eventType: string;
  summary: string;
}

interface ChatMessage {
  id: string;
  role: 'member' | 'assistant';
  text: string;
  adjustment?: PlanAdjustment;
  facts?: RememberedFact[];
}

interface PendingConfirmation extends PlanAdjustment {
  confirmation: PlanOverwriteConfirmation;
}

const PROMPTS = ['My left knee hurts today', 'I only have 30 minutes', 'I started a new medication'];

// A toast or the confirm dialog opening is not the member leaving the chat.
function isToastTarget(target: EventTarget | null) {
  return target instanceof Element && target.closest('[data-sonner-toast]') !== null;
}

// FR-25/FR-26: messages live only in this component's state - no persisted thread, so a reload forgets
// them. Durability lives entirely in the facts chat.send extracts server-side.
export function ChatPanel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const ability = useAppAbility();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const send = useMutation(
    trpc.chat.send.mutationOptions({
      onSuccess: (result) => {
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: result.reply,
            adjustment: result.adjustment,
            facts: result.facts,
          },
        ]);
        if (result.facts.length > 0) {
          queryClient.invalidateQueries({ queryKey: trpc.profile.listMine.queryKey() });
        }
      },
      onError: () => toast.error("We couldn't get a reply. Try again."),
    }),
  );

  const invalidatePlanQueries = () => {
    queryClient.invalidateQueries({ queryKey: trpc.plans.getToday.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.plans.getByDate.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.plans.listUpcoming.queryKey() });
  };

  const adjustPlan = useMutation(
    trpc.chat.adjustPlan.mutationOptions({
      onSuccess: (result, variables) => {
        if (result.status === 'needs_confirmation') {
          setPendingConfirmation({ date: variables.date, instruction: variables.instruction, confirmation: result });
          return;
        }
        invalidatePlanQueries();
        toast.message(`Plan for ${formatPlanDate(variables.date)} updated.`);
      },
      onError: () => toast.error("We couldn't apply that change right now. Nothing was changed. Try again."),
    }),
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: messages and send.isPending are the triggers, not values read inside.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, send.isPending]);

  if (!ability.can('create', 'ProfileEvent')) return null;

  function sendMessage(text: string) {
    const message = text.trim();
    if (!message || send.isPending) return;
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'member', text: message }]);
    setDraft('');
    send.mutate({ message });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    sendMessage(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage(draft);
    }
  }

  function handleConfirm() {
    if (!pendingConfirmation) return;
    adjustPlan.mutate({
      date: pendingConfirmation.date,
      instruction: pendingConfirmation.instruction,
      confirmOverwrite: true,
    });
    setPendingConfirmation(null);
  }

  return (
    <>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <Button
            type="button"
            size="lg"
            className="fixed right-4 bottom-4 z-40 rounded-full px-5 shadow-fab sm:right-6 sm:bottom-6"
          >
            <MessageCircleIcon data-icon="inline-start" />
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
              if (isToastTarget(event.target)) event.preventDefault();
            }}
            className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-card outline-none duration-300 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-4 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-4 sm:inset-auto sm:right-6 sm:bottom-24 sm:h-144 sm:max-h-[calc(100dvh-8rem)] sm:w-96 sm:rounded-lg sm:border sm:shadow-overlay"
          >
            <div className="flex items-start gap-3 bg-kit px-5 pt-4 pb-3 text-kit-foreground">
              <div className="flex-1">
                <Dialog.Title className="font-display text-xl font-bold tracking-wide uppercase">AI coach</Dialog.Title>
                <Dialog.Description className="text-xs text-kit-muted">
                  What you share here is remembered for future plans. The chat itself isn&apos;t saved.
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
              {messages.length === 0 && (
                <div className="flex flex-col gap-3 py-2">
                  <p className="text-sm text-muted-foreground">
                    Ask about your plan, report an injury, or share an update.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => sendMessage(prompt)}
                        className="min-h-11 rounded-full border border-input px-4 text-sm transition-colors outline-none hover:border-primary/60 hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/45"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex max-w-5/6 flex-col gap-1.5',
                    message.role === 'member' ? 'self-end' : 'self-start',
                  )}
                >
                  <div
                    className={cn(
                      'flex flex-col gap-2 rounded-lg px-3.5 py-2.5 text-sm text-pretty whitespace-pre-wrap',
                      message.role === 'member'
                        ? 'rounded-br-sm bg-primary text-primary-foreground'
                        : 'rounded-bl-sm bg-muted',
                    )}
                  >
                    {message.text}
                    {message.adjustment && (
                      <Button
                        type="button"
                        variant="tape"
                        className="h-auto min-h-11 w-full justify-start py-2 text-left text-sm whitespace-normal"
                        disabled={adjustPlan.isPending}
                        onClick={() => adjustPlan.mutate(message.adjustment!)}
                      >
                        <CalendarCheckIcon data-icon="inline-start" />
                        {adjustPlan.isPending
                          ? 'Applying...'
                          : `Apply to plan for ${formatPlanDate(message.adjustment.date, { day: 'numeric', month: 'short' })}`}
                      </Button>
                    )}
                  </div>
                  {message.facts && message.facts.length > 0 && (
                    <div className="flex flex-col gap-0.5 rounded-sm bg-accent/60 px-3 py-2 text-xs text-accent-foreground">
                      <p className="font-semibold">Remembered</p>
                      <ul className="flex flex-col">
                        {message.facts.map((fact) => (
                          <li key={fact.summary} className="text-pretty">
                            {fact.summary}
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={HEALTH_PROFILE_PATH}
                        onClick={() => setOpen(false)}
                        className="-mb-2 inline-flex min-h-11 w-fit items-center rounded-sm font-semibold underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/45"
                      >
                        See everything the coach remembers
                      </Link>
                    </div>
                  )}
                </div>
              ))}
              {send.isPending && (
                <div
                  role="status"
                  className="flex items-center gap-1 self-start rounded-lg rounded-bl-sm bg-muted px-3.5 py-3"
                  aria-label="Coach is typing"
                >
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="size-1.5 animate-pulse rounded-full bg-muted-foreground"
                      style={{ animationDelay: `${dot * 120}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t bg-card p-3">
              <Textarea
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message your coach..."
                aria-label="Message your coach"
                maxLength={2000}
                rows={1}
                className="max-h-32 min-h-11 flex-1 resize-none py-2.5"
              />
              <Button type="submit" size="icon" className="size-11" disabled={send.isPending || !draft.trim()}>
                <SendHorizontalIcon className="size-5" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <PlanOverwriteDialog
        confirmation={pendingConfirmation?.confirmation ?? null}
        intent="adjust"
        planDate={pendingConfirmation?.date}
        onConfirm={handleConfirm}
        onCancel={() => setPendingConfirmation(null)}
      />
    </>
  );
}
