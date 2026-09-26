import { and, asc, desc, eq, gte } from 'drizzle-orm';
import { db, type DatabaseExecutor } from '@api/db/client';
import {
  fProfileEvents,
  fTrainingPlanExercises,
  fTrainingPlans,
  type ProfileEvent,
  type TrainingPlan,
  type TrainingPlanExercise,
} from '@api/db/schema';

export async function findPlanByUserAndDate(
  userId: string,
  planDate: string,
  executor: DatabaseExecutor = db,
): Promise<TrainingPlan | null> {
  const [plan] = await executor
    .select()
    .from(fTrainingPlans)
    .where(and(eq(fTrainingPlans.userId, userId), eq(fTrainingPlans.planDate, planDate)));
  return plan ?? null;
}

export function findRecentPlans(userId: string, sinceDate: string, executor: DatabaseExecutor = db) {
  return executor
    .select()
    .from(fTrainingPlans)
    .where(and(eq(fTrainingPlans.userId, userId), gte(fTrainingPlans.planDate, sinceDate)))
    .orderBy(desc(fTrainingPlans.planDate));
}

export function findProfileEventsByUserId(userId: string, executor: DatabaseExecutor = db): Promise<ProfileEvent[]> {
  return executor.select().from(fProfileEvents).where(eq(fProfileEvents.userId, userId)).orderBy(desc(fProfileEvents.createdAt));
}

export function findExercisesForPlan(trainingPlanId: string, executor: DatabaseExecutor = db) {
  return executor
    .select()
    .from(fTrainingPlanExercises)
    .where(eq(fTrainingPlanExercises.trainingPlanId, trainingPlanId))
    .orderBy(asc(fTrainingPlanExercises.orderIndex));
}

export interface PlanExerciseInput {
  exerciseId: string;
  sets: number;
  reps: number;
  load?: string;
  notes?: string;
}

// Regenerating a date replaces the plan row in place (unique (user_id, plan_date)) and its whole
// exercise list, rather than accumulating rows - "regenerating a date twice leaves one plan row."
export async function replacePlan(
  input: { userId: string; planDate: string; exercises: PlanExerciseInput[] },
): Promise<TrainingPlan & { exercises: TrainingPlanExercise[] }> {
  return db.transaction(async (tx) => {
    const [plan] = await tx
      .insert(fTrainingPlans)
      .values({ userId: input.userId, planDate: input.planDate, status: 'ai_published', aiGeneratedAt: new Date() })
      .onConflictDoUpdate({
        target: [fTrainingPlans.userId, fTrainingPlans.planDate],
        set: {
          status: 'ai_published',
          aiGeneratedAt: new Date(),
          lastEditedByUserId: null,
          lastEditedAt: null,
        },
      })
      .returning();

    await tx.delete(fTrainingPlanExercises).where(eq(fTrainingPlanExercises.trainingPlanId, plan!.id));

    const exercises =
      input.exercises.length > 0
        ? await tx
            .insert(fTrainingPlanExercises)
            .values(
              input.exercises.map((exercise, index) => ({
                trainingPlanId: plan!.id,
                exerciseId: exercise.exerciseId,
                sets: exercise.sets,
                reps: exercise.reps,
                load: exercise.load,
                notes: exercise.notes,
                orderIndex: index,
              })),
            )
            .returning()
        : [];

    return { ...plan!, exercises };
  });
}
