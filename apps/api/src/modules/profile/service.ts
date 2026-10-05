import * as repository from '@api/modules/profile/repository';
import { injuryMuscles } from '@cadence/shared/schemas/profile-events';
import { TRPCError } from '@trpc/server';

export function listMine(userId: string) {
  return repository.findRememberedEvents(userId);
}

export async function setResolved(userId: string, id: string, resolved: boolean) {
  const row = await repository.updateResolvedAt({ userId, id, resolvedAt: resolved ? new Date() : null });
  if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Fact not found' });
  return row;
}

export async function confirmFacts(userId: string, facts: readonly { id: string; description?: string }[]) {
  const confirmed = await Promise.all(facts.map((fact) => repository.confirmPendingEvent({ userId, ...fact })));
  if (confirmed.some((row) => row === null)) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Fact not found or already confirmed' });
  }
  return confirmed;
}

export async function dismissFact(userId: string, id: string) {
  const row = await repository.dismissPendingEvent({ userId, id });
  if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Fact not found or already confirmed' });
  return row;
}

// What the muscle map shows as injured: the confirmed, unresolved injuries that name at least one muscle.
export async function listActiveInjuries(userId: string) {
  const events = await repository.findActiveInjuryEvents(userId);
  return events.flatMap((event) => {
    const muscles = injuryMuscles(event.payload);
    const description = (event.payload as { description?: unknown } | null)?.description;
    if (muscles.length === 0 || typeof description !== 'string') return [];
    return [{ id: event.id, description, muscles, createdAt: event.createdAt }];
  });
}
