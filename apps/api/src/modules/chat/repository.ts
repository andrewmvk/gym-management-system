import { type DatabaseExecutor, db } from '@api/db/client';
import { fProfileEvents } from '@api/db/schema';
import type { ProfileEventType } from '@cadence/shared/schemas/profile-events';

export interface ProfileEventInput {
  userId: string;
  eventType: ProfileEventType;
  payload: unknown;
  sourceMessage: string;
}

// Facts the member does not need to be asked about are confirmed on insert (the column defaults to now).
export function insertConfirmedProfileEvents(inputs: ProfileEventInput[], executor: DatabaseExecutor = db) {
  if (inputs.length === 0) return Promise.resolve([]);
  return executor.insert(fProfileEvents).values(inputs).returning();
}

// Facts extracted from a message that need the member's yes wait for the member's confirmation, so they are stored unconfirmed.
export function insertPendingProfileEvents(inputs: ProfileEventInput[], executor: DatabaseExecutor = db) {
  if (inputs.length === 0) return Promise.resolve([]);
  return executor
    .insert(fProfileEvents)
    .values(inputs.map((input) => ({ ...input, confirmedAt: null })))
    .returning();
}
