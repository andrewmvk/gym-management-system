import { type DatabaseExecutor, db } from '@api/db/client';
import { dGymSettings, fCheckIns, GYM_SETTINGS_ID, type GymSettings } from '@api/db/schema';
import type { OpeningHours } from '@cadence/shared/schemas/gym';
import { and, countDistinct, eq, gte, lt, lte } from 'drizzle-orm';

export async function getOrCreateSettings(executor: DatabaseExecutor = db): Promise<GymSettings> {
  await executor.insert(dGymSettings).values({ id: GYM_SETTINGS_ID }).onConflictDoNothing();
  const [settings] = await executor.select().from(dGymSettings).where(eq(dGymSettings.id, GYM_SETTINGS_ID));
  return settings!;
}

export async function updateOpeningHours(openingHours: OpeningHours, executor: DatabaseExecutor = db) {
  await getOrCreateSettings(executor);
  const [settings] = await executor
    .update(dGymSettings)
    .set({ openingHours })
    .where(eq(dGymSettings.id, GYM_SETTINGS_ID))
    .returning();
  return settings!;
}

// Window start is inclusive: a check-in exactly `from` old still counts, one millisecond older does not.
// Distinct members, because a member who scans again after the kiosk cooldown is still one person in the gym.
export async function countMembersCheckedInBetween(from: Date, to: Date, executor: DatabaseExecutor = db) {
  const [row] = await executor
    .select({ total: countDistinct(fCheckIns.userId) })
    .from(fCheckIns)
    .where(and(gte(fCheckIns.checkedInAt, from), lte(fCheckIns.checkedInAt, to)));
  return row?.total ?? 0;
}

// Every check-in in [from, to), whatever its turnstile status: the member was physically there.
export function findCheckIns(from: Date, to: Date, executor: DatabaseExecutor = db) {
  return executor
    .select({ userId: fCheckIns.userId, checkedInAt: fCheckIns.checkedInAt })
    .from(fCheckIns)
    .where(and(gte(fCheckIns.checkedInAt, from), lt(fCheckIns.checkedInAt, to)));
}
