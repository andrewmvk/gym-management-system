import { type DatabaseExecutor, db } from '@api/db/client';
import { fProfileEvents } from '@api/db/schema';
import { and, desc, eq, isNotNull, isNull, ne, or } from 'drizzle-orm';

const eventColumns = {
  id: fProfileEvents.id,
  eventType: fProfileEvents.eventType,
  payload: fProfileEvents.payload,
  sourceMessage: fProfileEvents.sourceMessage,
  createdAt: fProfileEvents.createdAt,
  confirmedAt: fProfileEvents.confirmedAt,
  resolvedAt: fProfileEvents.resolvedAt,
};

// Muscle focus changes are system bookkeeping with their own screen, so they never show as a remembered fact.
// A pending fact is listed so the member can confirm it; one the member dismissed (resolved without ever
// being confirmed) is gone.
export function findRememberedEvents(userId: string, executor: DatabaseExecutor = db) {
  return executor
    .select(eventColumns)
    .from(fProfileEvents)
    .where(
      and(
        eq(fProfileEvents.userId, userId),
        ne(fProfileEvents.eventType, 'muscle_focus_changed'),
        or(isNotNull(fProfileEvents.confirmedAt), isNull(fProfileEvents.resolvedAt)),
      ),
    )
    .orderBy(desc(fProfileEvents.createdAt));
}

// Scoped by user id in the same statement, so an id that belongs to someone else matches nothing.
export async function updateResolvedAt(
  input: { userId: string; id: string; resolvedAt: Date | null },
  executor: DatabaseExecutor = db,
) {
  const [row] = await executor
    .update(fProfileEvents)
    .set({ resolvedAt: input.resolvedAt })
    .where(and(eq(fProfileEvents.id, input.id), eq(fProfileEvents.userId, input.userId)))
    .returning(eventColumns);
  return row ?? null;
}

// Confirming makes the fact count from now on; an edited description replaces the one the coach wrote.
export async function confirmPendingEvent(
  input: { userId: string; id: string; description?: string },
  executor: DatabaseExecutor = db,
) {
  const [pending] = await executor
    .select({ payload: fProfileEvents.payload })
    .from(fProfileEvents)
    .where(
      and(
        eq(fProfileEvents.id, input.id),
        eq(fProfileEvents.userId, input.userId),
        isNull(fProfileEvents.confirmedAt),
        isNull(fProfileEvents.resolvedAt),
      ),
    );
  if (!pending) return null;

  const payload =
    input.description !== undefined && typeof pending.payload === 'object' && pending.payload !== null
      ? { ...pending.payload, description: input.description }
      : pending.payload;
  const [row] = await executor
    .update(fProfileEvents)
    .set({ confirmedAt: new Date(), payload })
    .where(and(eq(fProfileEvents.id, input.id), eq(fProfileEvents.userId, input.userId)))
    .returning(eventColumns);
  return row ?? null;
}

export async function dismissPendingEvent(input: { userId: string; id: string }, executor: DatabaseExecutor = db) {
  const [row] = await executor
    .update(fProfileEvents)
    .set({ resolvedAt: new Date() })
    .where(
      and(
        eq(fProfileEvents.id, input.id),
        eq(fProfileEvents.userId, input.userId),
        isNull(fProfileEvents.confirmedAt),
        isNull(fProfileEvents.resolvedAt),
      ),
    )
    .returning(eventColumns);
  return row ?? null;
}

export function findActiveInjuryEvents(userId: string, executor: DatabaseExecutor = db) {
  return executor
    .select(eventColumns)
    .from(fProfileEvents)
    .where(
      and(
        eq(fProfileEvents.userId, userId),
        eq(fProfileEvents.eventType, 'injury'),
        isNotNull(fProfileEvents.confirmedAt),
        isNull(fProfileEvents.resolvedAt),
      ),
    )
    .orderBy(desc(fProfileEvents.createdAt));
}
