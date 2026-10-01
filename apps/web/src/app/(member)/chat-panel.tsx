'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarCheckIcon, MessageCircleIcon, SendHorizontalIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { toast } from 'sonner';
import { useAppAbility } from '@/abilities';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface PlanAdjustment {
  date: string;
  instruction: string;
}

interface ChatMessage {
  role: 'member' | 'assistant';
  text: string;
  adjustment?: PlanAdjustment;
}

interface PendingConfirmation extends PlanAdjustment {
  editedBy: string;
}

const PROMPTS = ['My left knee hurts today', "I only have 30 minutes", 'I started a new medication'];

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
      onSuccess: (result) =>
        setMessages((current) => [
          ...current,
          { role: 'assistant', text: result.reply, adjustment: result.adjustment },
        ]),
      onError: () => toast.error("We couldn't get a reply. Try again."),
    }),
  );

  const invalidatePlanQueries = () => {
    queryClient.invalidateQueries({ queryKey: trpc.plans.getToday.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.plans.getByDate.queryKey() });
  };

  const adjustPlan = useMutation(
    trpc.chat.adjustPlan.mutationOptions({
      onSuccess: (result, variables) => {
        if (result.status === 'needs_confirmation') {
          setPendingConfirmation({ date: variables.date, instruction: variables.instruction, editedBy: result.editedBy });
          return;
        }
        invalidatePlanQueries();
        toast.message(`Plan for ${variables.date} updated.`);
      },
      onError: () => toast.error("We couldn't apply that change. Try again."),
    }),
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, send.isPending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!ability.can('create', 'ProfileEvent')) return null;

  function sendMessage(text: string) {
    const message = text.trim();
    if (!message || send.isPending) return;
    setMessages((current) => [...current, { role: 'member', text: message }]);
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
    if (event.key === 'Escape') setOpen(false);
  }

  function handleConfirm() {
    if (!pendingConfirmation) return;
    adjustPlan.mutate({ date: pendingConfirmation.date, instruction: pendingConfirmation.instruction, confirmOverwrite: true });
    setPendingConfirmation(null);
  }

  return (
    <>
      {open && (
        <section
          aria-label="AI coach"
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-card duration-300 animate-in fade-in-0 slide-in-from-bottom-4 sm:inset-auto sm:right-6 sm:bottom-24 sm:h-144 sm:max-h-[calc(100dvh-8rem)] sm:w-96 sm:rounded-lg sm:border sm:shadow-overlay"
        >
          <div className="flex items-start gap-3 bg-kit px-5 pt-4 pb-3 text-kit-foreground">
            <div className="flex-1">
              <p className="font-display text-xl font-bold tracking-wide uppercase">AI coach</p>
              <p className="text-xs text-kit-muted">What you share here is remembered for future plans. The chat itself isn&apos;t saved.</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="-mr-2 text-kit-foreground hover:bg-white/10"
              onClick={() => setOpen(false)}
            >
              <XIcon className="size-5" />
              <span className="sr-only">Close chat</span>
            </Button>
          </div>

          <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.length === 0 && (
              <div className="flex flex-col gap-3 py-2">
                <p className="text-sm text-muted-foreground">Ask about your plan, report an injury, or share an update.</p>
                <div className="flex flex-wrap gap-2">
                  {PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendMessage(prompt)}
                      className="rounded-full border border-input px-3 py-1.5 text-sm transition-colors outline-none hover:border-primary/60 hover:bg-accent/60 focus-visible:ring-3 focus-visible:ring-ring/45"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex max-w-5/6 flex-col gap-2 rounded-lg px-3.5 py-2.5 text-sm text-pretty whitespace-pre-wrap',
                  message.role === 'member'
                    ? 'self-end rounded-br-sm bg-primary text-primary-foreground'
                    : 'self-start rounded-bl-sm bg-muted',
                )}
              >
                {message.text}
                {message.adjustment && (
                  <Button
                    type="button"
                    size="sm"
                    variant="tape"
                    className="self-start"
                    disabled={adjustPlan.isPending}
                    onClick={() => adjustPlan.mutate(message.adjustment!)}
                  >
                    <CalendarCheckIcon data-icon="inline-start" />
                    {adjustPlan.isPending ? 'Applying...' : `Apply to plan for ${message.adjustment.date}`}
                  </Button>
                )}
              </div>
            ))}
            {send.isPending && (
              <div className="flex items-center gap-1 self-start rounded-lg rounded-bl-sm bg-muted px-3.5 py-3" aria-label="Coach is typing">
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
              className="max-h-32 min-h-10 flex-1 resize-none py-2"
            />
            <Button type="submit" size="icon" disabled={send.isPending || !draft.trim()}>
              <SendHorizontalIcon className="size-5" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </section>
      )}

      <Button
        type="button"
        size="lg"
        aria-expanded={open}
        className={cn(
          'fixed right-4 bottom-4 z-40 rounded-full px-5 shadow-fab sm:right-6 sm:bottom-6',
          open && 'hidden sm:inline-flex',
        )}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? <XIcon data-icon="inline-start" /> : <MessageCircleIcon data-icon="inline-start" />}
        {open ? 'Close' : 'Coach'}
      </Button>

      <AlertDialog open={pendingConfirmation !== null} onOpenChange={(isOpen) => !isOpen && setPendingConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>A trainer already adjusted this plan</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingConfirmation?.editedBy ? `${pendingConfirmation.editedBy} edited it. ` : ''}Applying this change
              will replace their edits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingConfirmation(null)}>Keep trainer&apos;s plan</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Replace edits</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
