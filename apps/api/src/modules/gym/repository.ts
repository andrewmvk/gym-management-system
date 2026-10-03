import { type DatabaseExecutor, db } from '@api/db/client';
import {
  dExerciseEquipment,
  dExercises,
  dGymEquipment,
  dGymSettings,
  fCheckIns,
  fTrainingPlanExercises,
  fTrainingPlans,
  GYM_SETTINGS_ID,
  type GymSettings,
} from '@api/db/schema';
import { findMusclesByExerciseIds } from '@api/modules/catalog/repository';
import { and, count, eq, gte, inArray, lt, lte } from 'drizzle-orm';

export async function getOrCreateSettings(executor: DatabaseExecutor = db): Promise<GymSettings> {
  await executor.insert(dGymSettings).values({ id: GYM_SETTINGS_ID }).onConflictDoNothing();
  const [settings] = await executor.select().from(dGymSettings).where(eq(dGymSettings.id, GYM_SETTINGS_ID));
  return settings!;
}

// Window start is inclusive: a check-in exactly `from` old still counts, one millisecond older does not.
export async function countCheckInsBetween(from: Date, to: Date, executor: DatabaseExecutor = db) {
  const [row] = await executor
    .select({ total: count() })
    .from(fCheckIns)
    .where(and(gte(fCheckIns.checkedInAt, from), lte(fCheckIns.checkedInAt, to)));
  return row?.total ?? 0;
}

// Every check-in instant in [from, to), whatever its turnstile status: the member was physically there.
export async function findCheckInTimes(from: Date, to: Date, executor: DatabaseExecutor = db) {
  const rows = await executor
    .select({ checkedInAt: fCheckIns.checkedInAt })
    .from(fCheckIns)
    .where(and(gte(fCheckIns.checkedInAt, from), lt(fCheckIns.checkedInAt, to)));
  return rows.map((row) => row.checkedInAt);
}

// One row per planned exercise on the date, for members with at least one check-in in [from, to).
export async function findPlannedExercisesOfCheckedInMembers(
  planDate: string,
  from: Date,
  to: Date,
  executor: DatabaseExecutor = db,
) {
  const checkedInMembers = executor
    .select({ userId: fCheckIns.userId })
    .from(fCheckIns)
    .where(and(gte(fCheckIns.checkedInAt, from), lt(fCheckIns.checkedInAt, to)));

  const rows = await executor
    .select({ exerciseId: dExercises.id, sets: fTrainingPlanExercises.sets })
    .from(fTrainingPlanExercises)
    .innerJoin(fTrainingPlans, eq(fTrainingPlans.id, fTrainingPlanExercises.trainingPlanId))
    .innerJoin(dExercises, eq(dExercises.id, fTrainingPlanExercises.exerciseId))
    .where(and(eq(fTrainingPlans.planDate, planDate), inArray(fTrainingPlans.userId, checkedInMembers)));

  const muscles = await findMusclesByExerciseIds(
    rows.map((row) => row.exerciseId),
    executor,
  );
  return rows.map((row) => ({ ...row, muscles: muscles.get(row.exerciseId) ?? [] }));
}

export function findEquipmentForExercises(exerciseIds: string[], executor: DatabaseExecutor = db) {
  if (exerciseIds.length === 0) return Promise.resolve([]);
  return executor
    .select({
      exerciseId: dExerciseEquipment.exerciseId,
      name: dGymEquipment.name,
      isAvailable: dGymEquipment.isAvailable,
    })
    .from(dExerciseEquipment)
    .innerJoin(dGymEquipment, eq(dGymEquipment.id, dExerciseEquipment.equipmentId))
    .where(inArray(dExerciseEquipment.exerciseId, exerciseIds));
}
