import type { ProfileEventType } from '@cadence/shared/schemas/profile-events';
import { db, type DatabaseExecutor } from '@api/db/client';
import { fProfileEvents } from '@api/db/schema';

export interface ProfileEventInput {
  userId: string;
  eventType: ProfileEventType;
  payload: unknown;
  sourceMessage: string;
}

export function insertProfileEvents(inputs: ProfileEventInput[], executor: DatabaseExecutor = db) {
  if (inputs.length === 0) return Promise.resolve([]);
  return executor.insert(fProfileEvents).values(inputs).returning();
}
