import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import { db, type DatabaseExecutor } from '@api/db/client';
import {
  dExercises,
  dUsers,
  fPlanReviews,
  fProfileEvents,
  fTrainingPlanExercises,
  fTrainingPlans,
  type PlanReview,
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
// the service layer from the catalog's current availability, not stored here. Used by both the member
// plan view and the trainer review detail page.
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

export interface PlanQueueEntry extends TrainingPlan {
  memberName: string;
  lastNote: string | null;
}

// "Recent" per the prompt's own wording, with no artificial cap - this is a demo-scale dataset. The
// last note per plan is computed in application code (fetch both tables, reduce in memory) rather than
// a correlated subquery, since there's no need for that complexity at this scale.
export async function findPlansQueue(executor: DatabaseExecutor = db): Promise<PlanQueueEntry[]> {
  const [plans, reviews] = await Promise.all([
    executor
      .select({
        id: fTrainingPlans.id,
        userId: fTrainingPlans.userId,
        planDate: fTrainingPlans.planDate,
        aiGeneratedAt: fTrainingPlans.aiGeneratedAt,
        status: fTrainingPlans.status,
        lastEditedByUserId: fTrainingPlans.lastEditedByUserId,
        lastEditedAt: fTrainingPlans.lastEditedAt,
        memberName: dUsers.name,
      })
      .from(fTrainingPlans)
      .innerJoin(dUsers, eq(dUsers.id, fTrainingPlans.userId))
      .orderBy(desc(fTrainingPlans.planDate)),
    executor.select().from(fPlanReviews).orderBy(desc(fPlanReviews.createdAt)),
  ]);

  const lastNoteByPlanId = new Map<string, string>();
  for (const review of reviews) {
    if (!lastNoteByPlanId.has(review.trainingPlanId)) lastNoteByPlanId.set(review.trainingPlanId, review.note);
  }

  return plans.map((plan) => ({ ...plan, lastNote: lastNoteByPlanId.get(plan.id) ?? null }));
}

export interface PlanWithMember extends TrainingPlan {
  memberName: string;
  memberEmail: string;
}

export async function findPlanWithMember(planId: string, executor: DatabaseExecutor = db): Promise<PlanWithMember | null> {
  const [row] = await executor
    .select({
      id: fTrainingPlans.id,
      userId: fTrainingPlans.userId,
      planDate: fTrainingPlans.planDate,
      aiGeneratedAt: fTrainingPlans.aiGeneratedAt,
      status: fTrainingPlans.status,
      lastEditedByUserId: fTrainingPlans.lastEditedByUserId,
      lastEditedAt: fTrainingPlans.lastEditedAt,
      memberName: dUsers.name,
      memberEmail: dUsers.email,
    })
    .from(fTrainingPlans)
    .innerJoin(dUsers, eq(dUsers.id, fTrainingPlans.userId))
    .where(eq(fTrainingPlans.id, planId));
  return row ?? null;
}

export interface PlanReviewEntry extends PlanReview {
  authorName: string;
}

// Chronological (oldest first): "notes from two trainers are both kept, in order" (FR-19) reads
// naturally as a history, not a most-recent-first feed.
export async function findReviewsForPlan(planId: string, executor: DatabaseExecutor = db): Promise<PlanReviewEntry[]> {
  return executor
    .select({
      id: fPlanReviews.id,
      trainingPlanId: fPlanReviews.trainingPlanId,
      userId: fPlanReviews.userId,
      note: fPlanReviews.note,
      isEdit: fPlanReviews.isEdit,
      createdAt: fPlanReviews.createdAt,
      authorName: dUsers.name,
    })
    .from(fPlanReviews)
    .innerJoin(dUsers, eq(dUsers.id, fPlanReviews.userId))
    .where(eq(fPlanReviews.trainingPlanId, planId))
    .orderBy(asc(fPlanReviews.createdAt));
}

export async function insertReview(
  input: { trainingPlanId: string; userId: string; note: string; isEdit: boolean },
  executor: DatabaseExecutor = db,
): Promise<PlanReview> {
  const [row] = await executor.insert(fPlanReviews).values(input).returning();
  return row!;
}

// A direct trainer edit (FR-19): replaces the exercise list, flips status to trainer_edited, and
// records who/when - the AI-generation fields (ai_generated_at) are left untouched, since this isn't a
// regeneration.
export async function editPlanExercises(
  input: { planId: string; exercises: PlanExerciseInput[]; editedByUserId: string },
  executor: DatabaseExecutor = db,
): Promise<TrainingPlan & { exercises: TrainingPlanExercise[] }> {
  return db.transaction(async (tx) => {
    const [plan] = await tx
      .update(fTrainingPlans)
      .set({ status: 'trainer_edited', lastEditedByUserId: input.editedByUserId, lastEditedAt: new Date() })
      .where(eq(fTrainingPlans.id, input.planId))
      .returning();

    await tx.delete(fTrainingPlanExercises).where(eq(fTrainingPlanExercises.trainingPlanId, input.planId));

    const exercises =
      input.exercises.length > 0
        ? await tx
            .insert(fTrainingPlanExercises)
            .values(
              input.exercises.map((exercise, index) => ({
                trainingPlanId: input.planId,
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
