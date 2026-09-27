import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import { db, type DatabaseExecutor } from '@api/db/client';
import {
  dExercises,
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

export interface PlanExerciseDetail extends TrainingPlanExercise {
  exerciseName: string;
  muscleGroup: string;
  instructions: string;
}

// Joined to d_exercises for display (name/instructions/muscle group) - isPerformable is computed by
// the service layer from the catalog's current availability, not stored here.
export function findExercisesForPlanWithDetails(
  trainingPlanId: string,
  executor: DatabaseExecutor = db,
): Promise<PlanExerciseDetail[]> {
  return executor
    .select({
      id: fTrainingPlanExercises.id,
      trainingPlanId: fTrainingPlanExercises.trainingPlanId,
      exerciseId: fTrainingPlanExercises.exerciseId,
      sets: fTrainingPlanExercises.sets,
      reps: fTrainingPlanExercises.reps,
      load: fTrainingPlanExercises.load,
      orderIndex: fTrainingPlanExercises.orderIndex,
      completed: fTrainingPlanExercises.completed,
      notes: fTrainingPlanExercises.notes,
      exerciseName: dExercises.name,
      muscleGroup: dExercises.muscleGroup,
      instructions: dExercises.instructions,
    })
    .from(fTrainingPlanExercises)
    .innerJoin(dExercises, eq(dExercises.id, fTrainingPlanExercises.exerciseId))
    .where(eq(fTrainingPlanExercises.trainingPlanId, trainingPlanId))
    .orderBy(asc(fTrainingPlanExercises.orderIndex));
}

export async function findPlanDatesInRange(
  userId: string,
  from: string,
  to: string,
  executor: DatabaseExecutor = db,
): Promise<string[]> {
  const rows = await executor
    .select({ planDate: fTrainingPlans.planDate })
    .from(fTrainingPlans)
    .where(and(eq(fTrainingPlans.userId, userId), gte(fTrainingPlans.planDate, from), lte(fTrainingPlans.planDate, to)))
    .orderBy(desc(fTrainingPlans.planDate));
  return rows.map((row) => row.planDate);
}

// Looks up who actually owns the plan a given exercise row belongs to, since markExerciseCompleted's
// planExerciseId is client-supplied and must never be trusted as "belongs to the caller" on its own.
export async function findExerciseOwner(
  planExerciseId: string,
  executor: DatabaseExecutor = db,
): Promise<{ userId: string; trainingPlanId: string } | null> {
  const [row] = await executor
    .select({ userId: fTrainingPlans.userId, trainingPlanId: fTrainingPlans.id })
    .from(fTrainingPlanExercises)
    .innerJoin(fTrainingPlans, eq(fTrainingPlans.id, fTrainingPlanExercises.trainingPlanId))
    .where(eq(fTrainingPlanExercises.id, planExerciseId));
  return row ?? null;
}

export async function setExerciseCompleted(
  planExerciseId: string,
  completed: boolean,
  executor: DatabaseExecutor = db,
): Promise<TrainingPlanExercise> {
  const [row] = await executor
    .update(fTrainingPlanExercises)
    .set({ completed })
    .where(eq(fTrainingPlanExercises.id, planExerciseId))
    .returning();
  return row!;
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
