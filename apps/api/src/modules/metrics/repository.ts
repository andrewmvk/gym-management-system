import { type DatabaseExecutor, db } from '@api/db/client';
import { dExercises, fCheckIns, fOnboardingSubmissions, fTrainingPlanExercises, fTrainingPlans } from '@api/db/schema';
import { findMusclesByExerciseIds } from '@api/modules/catalog/repository';
import { and, desc, eq, gte, lt, lte } from 'drizzle-orm';

// Every check-in instant in [from, to), whatever its turnstile status: the member was physically there (FR-36).
export async function findCheckInTimes(userId: string, from: Date, to: Date, executor: DatabaseExecutor = db) {
  const rows = await executor
    .select({ checkedInAt: fCheckIns.checkedInAt })
    .from(fCheckIns)
    .where(and(eq(fCheckIns.userId, userId), gte(fCheckIns.checkedInAt, from), lt(fCheckIns.checkedInAt, to)));
  return rows.map((row) => row.checkedInAt);
}

// Reads the plan tables as they are now, so a retroactive correction (RN-07) is already reflected.
export async function findPlanExercisesInRange(
  userId: string,
  fromDate: string,
  toDate: string,
  executor: DatabaseExecutor = db,
) {
  const rows = await executor
    .select({
      exerciseId: dExercises.id,
      exerciseName: dExercises.name,
      sets: fTrainingPlanExercises.sets,
      reps: fTrainingPlanExercises.reps,
      completed: fTrainingPlanExercises.completed,
    })
    .from(fTrainingPlanExercises)
    .innerJoin(fTrainingPlans, eq(fTrainingPlans.id, fTrainingPlanExercises.trainingPlanId))
    .innerJoin(dExercises, eq(dExercises.id, fTrainingPlanExercises.exerciseId))
    .where(
      and(
        eq(fTrainingPlans.userId, userId),
        gte(fTrainingPlans.planDate, fromDate),
        lte(fTrainingPlans.planDate, toDate),
      ),
    );

  const muscles = await findMusclesByExerciseIds(
    rows.map((row) => row.exerciseId),
    executor,
  );
  return rows.map((row) => ({ ...row, muscles: muscles.get(row.exerciseId) ?? [] }));
}

export async function findLatestGoals(userId: string, executor: DatabaseExecutor = db) {
  const [latest] = await executor
    .select({ goals: fOnboardingSubmissions.goals })
    .from(fOnboardingSubmissions)
    .where(eq(fOnboardingSubmissions.userId, userId))
    .orderBy(desc(fOnboardingSubmissions.submittedAt))
    .limit(1);
  return latest?.goals ?? null;
}
