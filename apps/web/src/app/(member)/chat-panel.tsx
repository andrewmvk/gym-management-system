'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type KeyboardEvent } from 'react';
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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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

  if (!ability.can('create', 'ProfileEvent')) return null;

  function submitDraft() {
    const message = draft.trim();
    if (!message || send.isPending) return;
    setMessages((current) => [...current, { role: 'member', text: message }]);
    setDraft('');
    send.mutate({ message });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submitDraft();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitDraft();
    }
  }

  function handleApply(adjustment: PlanAdjustment) {
    adjustPlan.mutate({ date: adjustment.date, instruction: adjustment.instruction });
  }

  function handleConfirm() {
    if (!pendingConfirmation) return;
    adjustPlan.mutate({ date: pendingConfirmation.date, instruction: pendingConfirmation.instruction, confirmOverwrite: true });
    setPendingConfirmation(null);
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:right-6 sm:bottom-6">
      {open && (
        <Card className="flex h-[70vh] w-[calc(100vw-2rem)] flex-col sm:h-96 sm:w-80">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>AI Coach</CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-2 overflow-y-auto">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">Ask about your plan, report an injury, or share an update.</p>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                  message.role === 'member' ? 'self-end bg-primary text-primary-foreground' : 'self-start bg-muted',
                )}
              >
                {message.text}
                {message.adjustment && (
                  <div className="mt-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={adjustPlan.isPending}
                      onClick={() => handleApply(message.adjustment!)}
                    >
                      {adjustPlan.isPending ? 'Applying...' : `Apply to my plan for ${message.adjustment.date}`}
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {send.isPending && <p className="self-start animate-pulse text-sm text-muted-foreground">Coach is typing...</p>}
          </CardContent>
          <CardFooter>
            <form onSubmit={handleSubmit} className="flex w-full items-end gap-2">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message your AI coach..."
                maxLength={2000}
                className="max-h-24 min-h-10 flex-1 resize-none"
              />
              <Button type="submit" disabled={send.isPending || !draft.trim()}>
                Send
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
      <Button type="button" size="lg" className="rounded-full shadow-lg" onClick={() => setOpen((current) => !current)}>
        {open ? 'Hide chat' : 'Chat with AI coach'}
      </Button>

      <AlertDialog open={pendingConfirmation !== null} onOpenChange={(isOpen) => !isOpen && setPendingConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>A trainer already adjusted this plan</AlertDialogTitle>
            <AlertDialogDescription>Regenerating will replace their edits.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingConfirmation(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
