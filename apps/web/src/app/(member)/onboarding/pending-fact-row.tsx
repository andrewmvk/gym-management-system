'use client';

import { muscleLabel } from '@cadence/shared/schemas/muscles';
import { injuryMuscles, PROFILE_EVENT_LABELS, type ProfileEventType } from '@cadence/shared/schemas/profile-events';
import { type FormEvent, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDateTime } from '@/lib/format';

export interface PendingFact {
  id: string;
  eventType: ProfileEventType;
  description: string;
  payload?: unknown;
  sourceMessage: string | null;
  createdAt: string | Date;
}

interface PendingFactRowProps {
  fact: PendingFact;
  isPending: boolean;
  onConfirm: (description?: string) => void;
  onDismiss: () => void;
}

// A fact the coach took from a chat and is waiting on you for. Dashed, because it is not settled yet: it
// shapes no plan until you confirm it.
export function PendingFactRow({ fact, isPending, onConfirm, onDismiss }: PendingFactRowProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const muscles = injuryMuscles(fact.payload).map(muscleLabel);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const description = draft?.trim();
    if (!description) return;
    onConfirm(description === fact.description ? undefined : description);
  }

  return (
    <li className="flex flex-col gap-3 border-b border-dashed px-5 py-4 last:border-b-0 sm:px-6">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="pending">Not confirmed yet</Badge>
          <span className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {PROFILE_EVENT_LABELS[fact.eventType]}
          </span>
        </div>
        {draft === null ? (
          <p className="text-base font-semibold text-pretty">{fact.description}</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={500}
              aria-label="Correct what your coach remembers"
              autoFocus
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending || !draft.trim()}>
                Save and confirm
              </Button>
              <Button type="button" variant="ghost" disabled={isPending} onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
        {muscles.length > 0 && <p className="text-sm text-muted-foreground">Affects: {muscles.join(', ')}</p>}
        <p className="numerals text-base font-semibold text-muted-foreground">{formatDateTime(fact.createdAt)}</p>
        {fact.sourceMessage && (
          <p className="line-clamp-2 text-sm break-words text-muted-foreground">
            You said: <q className="italic">{fact.sourceMessage}</q>
          </p>
        )}
      </div>
      {draft === null && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="min-h-11" disabled={isPending} onClick={() => onConfirm()}>
            Confirm
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={isPending}
            onClick={() => setDraft(fact.description)}
          >
            Edit
          </Button>
          <Button type="button" variant="ghost" className="min-h-11" disabled={isPending} onClick={onDismiss}>
            Dismiss
          </Button>
        </div>
      )}
    </li>
  );
}
