import * as repository from '@api/modules/profile/repository';
import { TRPCError } from '@trpc/server';

export function listMine(userId: string) {
  return repository.findRememberedEvents(userId);
}

export async function setResolved(userId: string, id: string, resolved: boolean) {
  const row = await repository.updateResolvedAt({ userId, id, resolvedAt: resolved ? new Date() : null });
  if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Fact not found' });
  return row;
}
