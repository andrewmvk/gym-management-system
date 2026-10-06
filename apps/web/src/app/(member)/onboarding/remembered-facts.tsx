'use client';

import { muscleLabel } from '@cadence/shared/schemas/muscles';
import {
  injuryMuscles,
  PROFILE_EVENT_LABELS,
  PROFILE_EVENT_TYPES,
  type ProfileEventType,
} from '@cadence/shared/schemas/profile-events';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BrainIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { PendingFactRow } from '@/app/(member)/onboarding/pending-fact-row';
import { Deferred } from '@/components/deferred';
import { EmptyState } from '@/components/empty-state';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';
import { useTRPC } from '@/lib/trpc';
import { cn } from '@/lib/utils';

const SKELETON_ROWS = 3;

interface RememberedEvent {
  id: string;
  eventType: ProfileEventType;
  payload?: unknown;
  sourceMessage: string | null;
  createdAt: string | Date;
  confirmedAt: string | Date | null;
  resolvedAt: string | Date | null;
}

function describeFact(event: RememberedEvent) {
  const payload = event.payload;
  if (typeof payload === 'object' && payload !== null && 'description' in payload) {
    const { description } = payload;
    if (typeof description === 'string' && description.trim()) return description;
  }
  return PROFILE_EVENT_LABELS[event.eventType];
}

function SectionShell({ children }: { children: ReactNode }) {
  return (
    <section aria-label="What your coach remembers" className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-5 py-4 sm:px-6">
        <h2 className="font-display text-xl font-bold tracking-wide uppercase">What your coach remembers</h2>
        <p className="max-w-prose text-sm text-pretty text-muted-foreground">
          Your coach asks before it keeps something from a chat, and uses these facts when it builds your plans. If one
          is wrong or no longer true, say so and the coach stops using it.
        </p>
      </div>
      {children}
    </section>
  );
}

function FactRowSkeleton() {
  return (
    <div className="flex flex-col gap-2 border-b px-5 py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:px-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      <Skeleton className="h-11 w-36" />
    </div>
  );
}

function RememberedFactsSkeleton() {
  return (
    <SectionShell>
      <Skeleton className="mx-5 mt-4 h-5 w-24 sm:mx-6" />
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders, never reordered.
        <FactRowSkeleton key={index} />
      ))}
    </SectionShell>
  );
}

interface FactRowProps {
  event: RememberedEvent;
  isPending: boolean;
  onToggle: (resolved: boolean) => void;
  isTypeShown?: boolean;
}

function FactRow({ event, isPending, onToggle, isTypeShown }: FactRowProps) {
  const isResolved = event.resolvedAt !== null;
  const muscles = injuryMuscles(event.payload).map(muscleLabel);

  return (
    <li className="flex flex-col gap-2 border-b px-5 py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6">
      <div className="flex min-w-0 flex-col gap-1">
        <p
          className={cn(
            'text-base font-semibold text-pretty',
            isResolved && 'text-muted-foreground line-through decoration-2',
          )}
        >
          {isTypeShown && <span className="font-normal">{PROFILE_EVENT_LABELS[event.eventType]}: </span>}
          {describeFact(event)}
        </p>
        {muscles.length > 0 && <p className="text-sm text-muted-foreground">Affects: {muscles.join(', ')}</p>}
        <p className="numerals text-base font-semibold text-muted-foreground">{formatDateTime(event.createdAt)}</p>
        {event.sourceMessage && (
          <p className="line-clamp-2 text-sm break-words text-muted-foreground">
            You said: <q className="italic">{event.sourceMessage}</q>
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 shrink-0"
        disabled={isPending}
        onClick={() => onToggle(!isResolved)}
      >
        {isResolved ? 'Applies again' : 'No longer true'}
      </Button>
    </li>
  );
}

function RememberedFactsRoot() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const eventsQuery = useQuery(trpc.profile.listMine.queryOptions());
  const listKey = trpc.profile.listMine.queryKey();

  const setResolved = useMutation(
    trpc.profile.setResolved.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: listKey });
        const previous = queryClient.getQueryData(listKey);
        queryClient.setQueryData(listKey, (old) =>
          old?.map((event) =>
            event.id === input.id ? { ...event, resolvedAt: input.resolved ? new Date().toISOString() : null } : event,
          ),
        );
        return { previous };
      },
      onError: (_error, _input, context) => {
        if (context?.previous !== undefined) queryClient.setQueryData(listKey, context.previous);
        toast.error("We couldn't save that change. Nothing was changed. Try again.");
      },
      onSuccess: (_data, input) => {
        toast.message(
          input.resolved
            ? 'Marked as no longer true. Your coach ignores it from now on.'
            : 'Applies again. Your coach uses it for your plans.',
        );
      },
      // Only the last of several quick taps refetches, so an early response never overwrites a later tap.
      onSettled: () => {
        if (queryClient.isMutating({ mutationKey: trpc.profile.setResolved.mutationKey() }) === 1) {
          queryClient.invalidateQueries({ queryKey: listKey });
        }
      },
    }),
  );

  function invalidateFacts() {
    queryClient.invalidateQueries({ queryKey: listKey });
    queryClient.invalidateQueries({ queryKey: trpc.profile.listActiveInjuries.queryKey() });
  }

  const confirmFact = useMutation(
    trpc.profile.confirmFacts.mutationOptions({
      onSuccess: () => toast.message('Saved. Your coach uses it from now on.'),
      onError: () => toast.error("We couldn't save that. Nothing was changed. Try again."),
      onSettled: invalidateFacts,
    }),
  );
  const dismissFact = useMutation(
    trpc.profile.dismissFact.mutationOptions({
      onSuccess: () => toast.message('Dismissed.'),
      onError: () => toast.error("We couldn't dismiss that. Nothing was changed. Try again."),
      onSettled: invalidateFacts,
    }),
  );

  if (eventsQuery.isPending) {
    return (
      <Deferred>
        <RememberedFactsSkeleton />
      </Deferred>
    );
  }

  if (eventsQuery.isError) {
    return (
      <SectionShell>
        <QueryError
          title="We couldn't load what your coach remembers"
          onRetry={() => eventsQuery.refetch()}
          isRetrying={eventsQuery.isRefetching}
          className="m-5 sm:m-6"
        />
      </SectionShell>
    );
  }

  const events: RememberedEvent[] = eventsQuery.data;
  const waiting = events.filter((event) => event.confirmedAt === null && event.resolvedAt === null);
  const remembered = events.filter((event) => event.confirmedAt !== null);
  const active = remembered.filter((event) => event.resolvedAt === null);
  const resolved = remembered.filter((event) => event.resolvedAt !== null);

  if (events.length === 0) {
    return (
      <SectionShell>
        <EmptyState
          icon={BrainIcon}
          title="Nothing remembered yet"
          description="Tell the coach about an injury or a change in your routine in the chat and it shows up here."
        />
      </SectionShell>
    );
  }

  const groups = PROFILE_EVENT_TYPES.map((type) => ({
    type,
    events: active.filter((event) => event.eventType === type),
  })).filter((group) => group.events.length > 0);

  const isFactBusy = (id: string) =>
    (confirmFact.isPending && confirmFact.variables?.facts.some((fact) => fact.id === id)) ||
    (dismissFact.isPending && dismissFact.variables?.id === id);

  return (
    <SectionShell>
      {waiting.length > 0 && (
        <div>
          <h3 className="border-b bg-muted/60 px-5 py-2 font-display text-sm font-semibold tracking-widest text-muted-foreground uppercase sm:px-6">
            Waiting for your confirmation ({waiting.length})
          </h3>
          <ul>
            {waiting.map((event) => (
              <PendingFactRow
                key={event.id}
                fact={{
                  id: event.id,
                  eventType: event.eventType,
                  description: describeFact(event),
                  payload: event.payload,
                  sourceMessage: event.sourceMessage,
                  createdAt: event.createdAt,
                }}
                isPending={Boolean(isFactBusy(event.id))}
                onConfirm={(description) => confirmFact.mutate({ facts: [{ id: event.id, description }] })}
                onDismiss={() => dismissFact.mutate({ id: event.id })}
              />
            ))}
          </ul>
        </div>
      )}
      {groups.length === 0 && waiting.length === 0 && (
        <p className="border-b px-5 py-4 text-sm text-muted-foreground sm:px-6">
          Everything your coach remembered is marked as no longer true, so nothing is used for your plans right now.
        </p>
      )}
      {groups.map((group) => (
        <div key={group.type}>
          <h3 className="border-b bg-muted/60 px-5 py-2 font-display text-sm font-semibold tracking-widest text-muted-foreground uppercase sm:px-6">
            {PROFILE_EVENT_LABELS[group.type]}
          </h3>
          <ul>
            {group.events.map((event) => (
              <FactRow
                key={event.id}
                event={event}
                isPending={setResolved.isPending && setResolved.variables?.id === event.id}
                onToggle={(isResolved) => setResolved.mutate({ id: event.id, resolved: isResolved })}
              />
            ))}
          </ul>
        </div>
      ))}
      {resolved.length > 0 && (
        <div>
          <h3 className="border-b bg-muted/60 px-5 py-2 font-display text-sm font-semibold tracking-widest text-muted-foreground uppercase sm:px-6">
            No longer true
          </h3>
          <ul>
            {resolved.map((event) => (
              <FactRow
                key={event.id}
                event={event}
                isTypeShown
                isPending={setResolved.isPending && setResolved.variables?.id === event.id}
                onToggle={(isResolved) => setResolved.mutate({ id: event.id, resolved: isResolved })}
              />
            ))}
          </ul>
        </div>
      )}
    </SectionShell>
  );
}

export const RememberedFacts = Object.assign(RememberedFactsRoot, { Skeleton: RememberedFactsSkeleton });
