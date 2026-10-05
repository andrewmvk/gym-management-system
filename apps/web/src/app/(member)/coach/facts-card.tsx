'use client';

import type { CoachBlock, PendingFact } from '@cadence/shared/schemas/coach';
import { muscleLabel } from '@cadence/shared/schemas/muscles';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckIcon, PencilIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { AiButton } from '@/components/ai-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HEALTH_PROFILE_PATH } from '@/lib/routes';
import { useTRPC } from '@/lib/trpc';

type FactsBlock = Extract<CoachBlock, { type: 'facts' }>;
type FactStatus = 'pending' | 'saved' | 'dismissed';

interface FactRowProps {
  fact: PendingFact;
  status: FactStatus;
  isBusy: boolean;
  onSave: (description?: string) => void;
  onDismiss: () => void;
}

function FactRow({ fact, status, isBusy, onSave, onDismiss }: FactRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(fact.description);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const next = draft.trim();
    if (!next) return;
    onSave(next === fact.description ? undefined : next);
    setIsEditing(false);
  }

  return (
    <li className="flex flex-col gap-1.5 border-b px-3 py-2.5 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="font-display text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            {fact.label}
            {fact.muscles.length > 0 && (
              <span className="font-sans tracking-normal normal-case">
                {' '}
                · Affects {fact.muscles.map((muscle) => muscleLabel(muscle).toLowerCase()).join(', ')}
              </span>
            )}
          </p>
          {!isEditing && (
            <p
              className={
                status === 'dismissed' ? 'text-sm text-muted-foreground line-through' : 'text-sm font-semibold'
              }
            >
              {fact.description}
            </p>
          )}
        </div>
        {status === 'saved' && (
          <Badge variant="live">
            <CheckIcon data-icon="inline-start" />
            Saved
          </Badge>
        )}
        {status === 'dismissed' && <Badge variant="ghost">Dismissed</Badge>}
        {status === 'pending' && <Badge variant="pending">Not saved yet</Badge>}
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Input
            value={draft}
            maxLength={500}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="What the coach should remember"
            className="min-w-0 flex-1"
          />
          <Button type="submit" size="icon" aria-label="Save this fact" disabled={!draft.trim() || isBusy}>
            <CheckIcon />
          </Button>
          <Button type="button" size="icon" variant="ghost" aria-label="Cancel" onClick={() => setIsEditing(false)}>
            <XIcon />
          </Button>
        </form>
      )}

      {status === 'pending' && !isEditing && (
        <div className="flex flex-wrap items-center gap-1.5">
          <AiButton mark="tempo" size="sm" isPending={isBusy} pendingLabel="Saving..." onClick={() => onSave()}>
            Save it
          </AiButton>
          <Button type="button" size="sm" variant="outline" disabled={isBusy} onClick={() => setIsEditing(true)}>
            <PencilIcon data-icon="inline-start" />
            Edit
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={isBusy} onClick={onDismiss}>
            Not right
          </Button>
        </div>
      )}
    </li>
  );
}

// Facts the coach picked up from the message wait here for the member: nothing is remembered, and nothing
// reaches a plan, until it is saved. Anything left unsaved stays on the Health profile page.
export function FactsCard({ block }: { block: FactsBlock }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [statuses, setStatuses] = useState<Record<string, FactStatus>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: trpc.profile.listMine.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.profile.listActiveInjuries.queryKey() });
  };

  const confirm = useMutation(
    trpc.profile.confirmFacts.mutationOptions({
      onSuccess: (_rows, variables) => {
        setStatuses((current) => ({ ...current, [variables.facts[0]!.id]: 'saved' }));
        refresh();
        toast.message('Saved. Your coach uses it from now on.');
      },
      onError: () => toast.error("We couldn't save that. Nothing was changed. Try again."),
      onSettled: () => setBusyId(null),
    }),
  );
  const dismiss = useMutation(
    trpc.profile.dismissFact.mutationOptions({
      onSuccess: (_row, variables) => {
        setStatuses((current) => ({ ...current, [variables.id]: 'dismissed' }));
        refresh();
      },
      onError: () => toast.error("We couldn't dismiss that. Try again."),
      onSettled: () => setBusyId(null),
    }),
  );

  return (
    <section
      aria-label="Facts to remember"
      className="animate-block-in flex flex-col rounded-lg border border-dashed bg-accent/40 text-card-foreground"
    >
      <h3 className="px-3 pt-2 font-display text-sm font-semibold tracking-widest text-accent-foreground uppercase">
        Remember this?
      </h3>
      <ul>
        {block.facts.map((fact) => (
          <FactRow
            key={fact.id}
            fact={fact}
            status={statuses[fact.id] ?? 'pending'}
            isBusy={busyId === fact.id}
            onSave={(description) => {
              setBusyId(fact.id);
              confirm.mutate({ facts: [{ id: fact.id, description }] });
            }}
            onDismiss={() => {
              setBusyId(fact.id);
              dismiss.mutate({ id: fact.id });
            }}
          />
        ))}
      </ul>
      <p className="border-t px-3 py-2 text-xs text-pretty text-muted-foreground">
        Anything you leave waits on your{' '}
        <Link href={HEALTH_PROFILE_PATH} className="font-semibold underline underline-offset-4">
          Health profile
        </Link>
        , and your coach does not use it until you save it.
      </p>
    </section>
  );
}
