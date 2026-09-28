'use client';

import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { toast } from 'sonner';
import { useAppAbility } from '@/abilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'member' | 'assistant';
  text: string;
}

// FR-25/FR-26: messages live only in this component's state - no persisted thread, so a reload forgets
// them. Durability lives entirely in the facts chat.send extracts server-side.
export function ChatPanel() {
  const trpc = useTRPC();
  const ability = useAppAbility();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const send = useMutation(
    trpc.chat.send.mutationOptions({
      onSuccess: (result) => setMessages((current) => [...current, { role: 'assistant', text: result.reply }]),
      onError: () => toast.error("We couldn't get a reply. Try again."),
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
    </div>
  );
}
