import { type DatabaseExecutor, db } from '@api/db/client';
import { fProfileEvents } from '@api/db/schema';
import type { ProfileEventType } from '@cadence/shared/schemas/profile-events';

export interface ProfileEventInput {
  userId: string;
  eventType: ProfileEventType;
  payload: unknown;
  sourceMessage: string;
}

// Facts extracted from a message wait for the member's confirmation, so they are stored unconfirmed.
export function insertPendingProfileEvents(inputs: ProfileEventInput[], executor: DatabaseExecutor = db) {
  if (inputs.length === 0) return Promise.resolve([]);
  return executor
    .insert(fProfileEvents)
    .values(inputs.map((input) => ({ ...input, confirmedAt: null })))
    .returning();
}
