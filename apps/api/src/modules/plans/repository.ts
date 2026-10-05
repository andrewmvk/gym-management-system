import { type DatabaseExecutor, db, type Transaction } from '@api/db/client';
import {
  dExercises,
  dUsers,
  fPlanChanges,
  fPlanReviews,
  fProfileEvents,
  fTrainingPlanExercises,
  fTrainingPlans,
  type PlanChange,
  type PlanReview,
  type ProfileEvent,
  type TrainingPlan,
  type TrainingPlanExercise,
} from '@api/db/schema';
import { findMusclesByExerciseIds } from '@api/modules/catalog/repository';
import type { ExerciseMuscle } from '@cadence/shared/schemas/muscles';
import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lt, lte, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

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

export interface PlanHistoryRow {
  planDate: string;
  exerciseName: string;
  sets: number;
  reps: number;
  load: number | null;
  completed: boolean;
}

// The member's own plans in [sinceDate, beforeDate), newest date first and in plan order within a date.
// beforeDate is exclusive so the plan about to be regenerated never reads as its own history.
export function findPlanHistory(
  userId: string,
  sinceDate: string,
  beforeDate: string,
  executor: DatabaseExecutor = db,
): Promise<PlanHistoryRow[]> {
  return executor
    .select({
      planDate: fTrainingPlans.planDate,
      exerciseName: dExercises.name,
      sets: fTrainingPlanExercises.sets,
      reps: fTrainingPlanExercises.reps,
      load: fTrainingPlanExercises.load,
      completed: fTrainingPlanExercises.completed,
    })
    .from(fTrainingPlanExercises)
    .innerJoin(fTrainingPlans, eq(fTrainingPlans.id, fTrainingPlanExercises.trainingPlanId))
    .innerJoin(dExercises, eq(dExercises.id, fTrainingPlanExercises.exerciseId))
    .where(
      and(
        eq(fTrainingPlans.userId, userId),
        gte(fTrainingPlans.planDate, sinceDate),
        lt(fTrainingPlans.planDate, beforeDate),
      ),
    )
    .orderBy(desc(fTrainingPlans.planDate), asc(fTrainingPlanExercises.orderIndex));
}

// Resolved events are the member's way of saying a fact no longer applies, and a pending one is a fact the
// member has not confirmed yet, so no prompt may see either.
export function findUnresolvedProfileEvents(userId: string, executor: DatabaseExecutor = db): Promise<ProfileEvent[]> {
  return executor
    .select()
    .from(fProfileEvents)
    .where(
      and(eq(fProfileEvents.userId, userId), isNull(fProfileEvents.resolvedAt), isNotNull(fProfileEvents.confirmedAt)),
    )
    .orderBy(desc(fProfileEvents.createdAt));
}

export interface MemberReviewRow {
  planDate: string;
  note: string;
  isEdit: boolean;
  createdAt: Date;
  authorName: string;
}

// Trainer notes and edits across every plan of one member, newest first.
export function findRecentReviewsForMember(
  userId: string,
  limit: number,
  executor: DatabaseExecutor = db,
): Promise<MemberReviewRow[]> {
  return executor
    .select({
      planDate: fTrainingPlans.planDate,
      note: fPlanReviews.note,
      isEdit: fPlanReviews.isEdit,
      createdAt: fPlanReviews.createdAt,
      authorName: dUsers.name,
    })
    .from(fPlanReviews)
    .innerJoin(fTrainingPlans, eq(fTrainingPlans.id, fPlanReviews.trainingPlanId))
    .innerJoin(dUsers, eq(dUsers.id, fPlanReviews.userId))
    .where(eq(fTrainingPlans.userId, userId))
    .orderBy(desc(fPlanReviews.createdAt))
    .limit(limit);
}

export interface DemandRow {
  trainingPlanId: string;
  exerciseId: string;
  sets: number;
}

// One row per exercise of every plan on the date except the excluded member's own, so the caller counts
// plans (distinct trainingPlanId), never rows.
export function findDemandRowsForDate(
  planDate: string,
  excludeUserId: string,
  executor: DatabaseExecutor = db,
): Promise<DemandRow[]> {
  return executor
    .select({
      trainingPlanId: fTrainingPlanExercises.trainingPlanId,
      exerciseId: fTrainingPlanExercises.exerciseId,
      sets: fTrainingPlanExercises.sets,
    })
    .from(fTrainingPlanExercises)
    .innerJoin(fTrainingPlans, eq(fTrainingPlans.id, fTrainingPlanExercises.trainingPlanId))
    .where(and(eq(fTrainingPlans.planDate, planDate), ne(fTrainingPlans.userId, excludeUserId)));
}

export interface UpcomingPlanRow {
  planDate: string;
  status: TrainingPlan['status'];
  exerciseCount: number;
}

export async function findUpcomingPlans(
  userId: string,
  fromDate: string,
  executor: DatabaseExecutor = db,
): Promise<UpcomingPlanRow[]> {
  const rows = await executor
    .select({
      planDate: fTrainingPlans.planDate,
      status: fTrainingPlans.status,
      exerciseCount: count(fTrainingPlanExercises.id),
    })
    .from(fTrainingPlans)
    .leftJoin(fTrainingPlanExercises, eq(fTrainingPlanExercises.trainingPlanId, fTrainingPlans.id))
    .where(and(eq(fTrainingPlans.userId, userId), gte(fTrainingPlans.planDate, fromDate)))
    .groupBy(fTrainingPlans.id, fTrainingPlans.planDate, fTrainingPlans.status)
    .orderBy(asc(fTrainingPlans.planDate));
  return rows;
}

export interface MemberPlanSummary {
  id: string;
  planDate: string;
  status: TrainingPlan['status'];
  exerciseCount: number;
  completedCount: number;
  // Plain trainer notes only: the entry an edit leaves behind is not a note.
  noteCount: number;
}

// Every plan of one member dated fromDate or later, newest date first: the staff member page reads
// completion and notes off this without opening each plan.
export async function findPlanSummariesForMember(
  userId: string,
  fromDate: string,
  executor: DatabaseExecutor = db,
): Promise<MemberPlanSummary[]> {
  const plans = await executor
    .select({
      id: fTrainingPlans.id,
      planDate: fTrainingPlans.planDate,
      status: fTrainingPlans.status,
      exerciseCount: count(fTrainingPlanExercises.id),
      completedCount:
        sql<number>`count(${fTrainingPlanExercises.id}) filter (where ${fTrainingPlanExercises.completed})`.mapWith(
          Number,
        ),
    })
    .from(fTrainingPlans)
    .leftJoin(fTrainingPlanExercises, eq(fTrainingPlanExercises.trainingPlanId, fTrainingPlans.id))
    .where(and(eq(fTrainingPlans.userId, userId), gte(fTrainingPlans.planDate, fromDate)))
    .groupBy(fTrainingPlans.id, fTrainingPlans.planDate, fTrainingPlans.status)
    .orderBy(desc(fTrainingPlans.planDate));
  if (plans.length === 0) return [];

  const notes = await executor
    .select({ trainingPlanId: fPlanReviews.trainingPlanId, noteCount: count() })
    .from(fPlanReviews)
    .where(
      and(
        inArray(
          fPlanReviews.trainingPlanId,
          plans.map((plan) => plan.id),
        ),
        eq(fPlanReviews.isEdit, false),
      ),
    )
    .groupBy(fPlanReviews.trainingPlanId);
  const noteCountByPlanId = new Map(notes.map((row) => [row.trainingPlanId, row.noteCount]));
  return plans.map((plan) => ({ ...plan, noteCount: noteCountByPlanId.get(plan.id) ?? 0 }));
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
  load?: number | null;
  notes?: string;
  // Left out, the tick of the same exercise in the plan being replaced is kept.
  completed?: boolean;
}

// Swaps a plan's whole exercise list while keeping the ticks of exercises that stay (matched by
// exerciseId): a regeneration or a trainer edit must not erase work the member already marked done.
async function replaceExerciseRows(tx: Transaction, planId: string, inputs: readonly PlanExerciseInput[]) {
  const previous = await tx
    .select({ exerciseId: fTrainingPlanExercises.exerciseId, completed: fTrainingPlanExercises.completed })
    .from(fTrainingPlanExercises)
    .where(eq(fTrainingPlanExercises.trainingPlanId, planId));
  const completedBefore = new Set(previous.filter((row) => row.completed).map((row) => row.exerciseId));

  await tx.delete(fTrainingPlanExercises).where(eq(fTrainingPlanExercises.trainingPlanId, planId));
  if (inputs.length === 0) return [];

  return tx
    .insert(fTrainingPlanExercises)
    .values(
      inputs.map((exercise, index) => ({
        trainingPlanId: planId,
        exerciseId: exercise.exerciseId,
        sets: exercise.sets,
        reps: exercise.reps,
        load: exercise.load,
        notes: exercise.notes,
        orderIndex: index,
        completed: exercise.completed ?? completedBefore.has(exercise.exerciseId),
      })),
    )
    .returning();
}

export interface PlanExerciseDetail extends TrainingPlanExercise {
  exerciseName: string;
  muscles: ExerciseMuscle[];
  instructions: string;
}

// Joined to d_exercises for display (name/instructions/muscles) - isPerformable is computed by
// the service layer from the catalog's current availability, not stored here. Used by both the member
// plan view and the trainer review detail page.
export async function findExercisesForPlanWithDetails(
  trainingPlanId: string,
  executor: DatabaseExecutor = db,
): Promise<PlanExerciseDetail[]> {
  const rows = await executor
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
      instructions: dExercises.instructions,
    })
    .from(fTrainingPlanExercises)
    .innerJoin(dExercises, eq(dExercises.id, fTrainingPlanExercises.exerciseId))
    .where(eq(fTrainingPlanExercises.trainingPlanId, trainingPlanId))
    .orderBy(asc(fTrainingPlanExercises.orderIndex));

  const muscles = await findMusclesByExerciseIds(
    rows.map((row) => row.exerciseId),
    executor,
  );
  return rows.map((row) => ({ ...row, muscles: muscles.get(row.exerciseId) ?? [] }));
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

// Regenerating a date replaces the plan row in place (unique (user_id, plan_date)) and its whole
// exercise list, rather than accumulating rows - "regenerating a date twice leaves one plan row."
export async function replacePlan(input: {
  userId: string;
  planDate: string;
  exercises: PlanExerciseInput[];
}): Promise<TrainingPlan & { exercises: TrainingPlanExercise[] }> {
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

    const exercises = await replaceExerciseRows(tx, plan!.id, input.exercises);
    return { ...plan!, exercises };
  });
}

export interface PlanQueueEntry extends TrainingPlan {
  memberName: string;
  lastNote: string | null;
  // Plain trainer notes, not the entries an edit leaves behind: a plan can hold notes without being edited.
  noteCount: number;
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
  const noteCountByPlanId = new Map<string, number>();
  for (const review of reviews) {
    if (!lastNoteByPlanId.has(review.trainingPlanId)) lastNoteByPlanId.set(review.trainingPlanId, review.note);
    if (!review.isEdit) {
      noteCountByPlanId.set(review.trainingPlanId, (noteCountByPlanId.get(review.trainingPlanId) ?? 0) + 1);
    }
  }

  return plans.map((plan) => ({
    ...plan,
    lastNote: lastNoteByPlanId.get(plan.id) ?? null,
    noteCount: noteCountByPlanId.get(plan.id) ?? 0,
  }));
}

export function findExerciseRowsForPlans(planIds: readonly string[], executor: DatabaseExecutor = db) {
  if (planIds.length === 0) return Promise.resolve([]);
  return executor
    .select({
      trainingPlanId: fTrainingPlanExercises.trainingPlanId,
      exerciseId: fTrainingPlanExercises.exerciseId,
      sets: fTrainingPlanExercises.sets,
    })
    .from(fTrainingPlanExercises)
    .where(inArray(fTrainingPlanExercises.trainingPlanId, [...planIds]));
}

// One row per planned exercise (among the given exercises) of every plan dated fromDate or later, with the
// member who owns it, so a caller counts distinct plans and members instead of rows.
export function findPlannedExerciseRowsFrom(
  exerciseIds: readonly string[],
  fromDate: string,
  executor: DatabaseExecutor = db,
) {
  if (exerciseIds.length === 0) return Promise.resolve([]);
  return executor
    .select({
      trainingPlanId: fTrainingPlans.id,
      userId: fTrainingPlans.userId,
      planDate: fTrainingPlans.planDate,
      exerciseId: fTrainingPlanExercises.exerciseId,
    })
    .from(fTrainingPlanExercises)
    .innerJoin(fTrainingPlans, eq(fTrainingPlans.id, fTrainingPlanExercises.trainingPlanId))
    .where(and(inArray(fTrainingPlanExercises.exerciseId, [...exerciseIds]), gte(fTrainingPlans.planDate, fromDate)));
}

export interface RecentReviewEntry {
  id: string;
  trainingPlanId: string;
  planDate: string;
  note: string;
  isEdit: boolean;
  createdAt: Date;
  authorName: string;
  memberName: string;
}

// Newest first, across every plan: the trainers' shared pool has no assignment, so "who already looked
// at this" is the only coordination signal there is.
export async function findRecentReviews(limit: number, executor: DatabaseExecutor = db): Promise<RecentReviewEntry[]> {
  const author = alias(dUsers, 'author');
  const member = alias(dUsers, 'member');
  return executor
    .select({
      id: fPlanReviews.id,
      trainingPlanId: fPlanReviews.trainingPlanId,
      planDate: fTrainingPlans.planDate,
      note: fPlanReviews.note,
      isEdit: fPlanReviews.isEdit,
      createdAt: fPlanReviews.createdAt,
      authorName: author.name,
      memberName: member.name,
    })
    .from(fPlanReviews)
    .innerJoin(fTrainingPlans, eq(fTrainingPlans.id, fPlanReviews.trainingPlanId))
    .innerJoin(author, eq(author.id, fPlanReviews.userId))
    .innerJoin(member, eq(member.id, fTrainingPlans.userId))
    .orderBy(desc(fPlanReviews.createdAt))
    .limit(limit);
}

// Notes and edit entries alike: both are a trainer touching the plan.
export async function findPlanIdsReviewedSince(since: Date, executor: DatabaseExecutor = db): Promise<string[]> {
  const rows = await executor
    .selectDistinct({ trainingPlanId: fPlanReviews.trainingPlanId })
    .from(fPlanReviews)
    .where(gte(fPlanReviews.createdAt, since));
  return rows.map((row) => row.trainingPlanId);
}

export interface PlanWithMember extends TrainingPlan {
  memberName: string;
  memberEmail: string;
}

export async function findPlanWithMember(
  planId: string,
  executor: DatabaseExecutor = db,
): Promise<PlanWithMember | null> {
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

export interface PlanExerciseForDate {
  exerciseName: string;
  sets: number;
  muscles: ExerciseMuscle[];
}

// FR-29: selects only the exercise's own name, sets and muscles - no user_id or any other identifying
// column ever leaves this query, so the aggregate it feeds can't leak a member's identity even by
// mistake further up the call chain.
export async function findExercisesForDate(
  planDate: string,
  executor: DatabaseExecutor = db,
): Promise<PlanExerciseForDate[]> {
  const rows = await executor
    .select({ exerciseId: dExercises.id, exerciseName: dExercises.name, sets: fTrainingPlanExercises.sets })
    .from(fTrainingPlanExercises)
    .innerJoin(fTrainingPlans, eq(fTrainingPlans.id, fTrainingPlanExercises.trainingPlanId))
    .innerJoin(dExercises, eq(dExercises.id, fTrainingPlanExercises.exerciseId))
    .where(eq(fTrainingPlans.planDate, planDate));

  const muscles = await findMusclesByExerciseIds(
    rows.map((row) => row.exerciseId),
    executor,
  );
  return rows.map(({ exerciseId, exerciseName, sets }) => ({
    exerciseName,
    sets,
    muscles: muscles.get(exerciseId) ?? [],
  }));
}

export async function insertProfileEvent(
  input: { userId: string; eventType: ProfileEvent['eventType']; payload: unknown; sourceMessage: string | null },
  executor: DatabaseExecutor = db,
): Promise<ProfileEvent> {
  const [row] = await executor.insert(fProfileEvents).values(input).returning();
  return row!;
}

export interface PlanChangeExercise {
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  // Kilograms. Entries saved before weights became numbers may still hold the text that was typed.
  load: number | string | null;
}

export interface AcknowledgedWarning {
  exerciseId: string;
  name: string;
  reason: string;
}

export interface PlanChangeInput {
  trainingPlanId: string;
  userId: string;
  kind: PlanChange['kind'];
  request: string | null;
  before: PlanChangeExercise[];
  after: PlanChangeExercise[];
  acknowledgedWarnings: AcknowledgedWarning[];
}

export async function insertPlanChange(input: PlanChangeInput, executor: DatabaseExecutor = db): Promise<PlanChange> {
  const [row] = await executor.insert(fPlanChanges).values(input).returning();
  return row!;
}

export function findPlanChangesForPlan(planId: string, executor: DatabaseExecutor = db): Promise<PlanChange[]> {
  return executor
    .select()
    .from(fPlanChanges)
    .where(eq(fPlanChanges.trainingPlanId, planId))
    .orderBy(asc(fPlanChanges.createdAt));
}

// The plans among the given ones where the member accepted a safety warning before applying a change, and no
// trainer has looked at the plan since: a note or an edit after the change counts as the review.
export async function findPlanIdsWithAcknowledgedRisk(
  planIds: readonly string[],
  executor: DatabaseExecutor = db,
): Promise<Map<string, AcknowledgedWarning[]>> {
  const risks = new Map<string, AcknowledgedWarning[]>();
  if (planIds.length === 0) return risks;
  const rows = await executor
    .select({
      trainingPlanId: fPlanChanges.trainingPlanId,
      acknowledgedWarnings: fPlanChanges.acknowledgedWarnings,
    })
    .from(fPlanChanges)
    .where(
      and(
        inArray(fPlanChanges.trainingPlanId, [...planIds]),
        sql`jsonb_array_length(${fPlanChanges.acknowledgedWarnings}) > 0`,
        sql`not exists (
          select 1 from ${fPlanReviews}
          where ${fPlanReviews.trainingPlanId} = ${fPlanChanges.trainingPlanId}
            and ${fPlanReviews.createdAt} > ${fPlanChanges.createdAt}
        )`,
      ),
    )
    .orderBy(asc(fPlanChanges.createdAt));
  for (const row of rows) {
    risks.set(row.trainingPlanId, [
      ...(risks.get(row.trainingPlanId) ?? []),
      ...(row.acknowledgedWarnings as AcknowledgedWarning[]),
    ]);
  }
  return risks;
}

export interface ExerciseForEdit {
  id: string;
  userId: string;
  trainingPlanId: string;
  planDate: string;
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  load: number | null;
}

export async function findExerciseForEdit(
  planExerciseId: string,
  executor: DatabaseExecutor = db,
): Promise<ExerciseForEdit | null> {
  const [row] = await executor
    .select({
      id: fTrainingPlanExercises.id,
      userId: fTrainingPlans.userId,
      trainingPlanId: fTrainingPlans.id,
      planDate: fTrainingPlans.planDate,
      exerciseId: fTrainingPlanExercises.exerciseId,
      exerciseName: dExercises.name,
      sets: fTrainingPlanExercises.sets,
      reps: fTrainingPlanExercises.reps,
      load: fTrainingPlanExercises.load,
    })
    .from(fTrainingPlanExercises)
    .innerJoin(fTrainingPlans, eq(fTrainingPlans.id, fTrainingPlanExercises.trainingPlanId))
    .innerJoin(dExercises, eq(dExercises.id, fTrainingPlanExercises.exerciseId))
    .where(eq(fTrainingPlanExercises.id, planExerciseId));
  return row ?? null;
}

export async function updateExerciseNumbers(
  planExerciseId: string,
  numbers: { sets: number; reps: number; load: number | null },
  executor: DatabaseExecutor = db,
): Promise<TrainingPlanExercise> {
  const [row] = await executor
    .update(fTrainingPlanExercises)
    .set(numbers)
    .where(eq(fTrainingPlanExercises.id, planExerciseId))
    .returning();
  return row!;
}

// A direct trainer edit (FR-19): replaces the exercise list, flips status to trainer_edited, and
// records who/when - the AI-generation fields (ai_generated_at) are left untouched, since this isn't a
// regeneration.
export async function editPlanExercises(input: {
  planId: string;
  exercises: PlanExerciseInput[];
  editedByUserId: string;
}): Promise<TrainingPlan & { exercises: TrainingPlanExercise[] }> {
  return db.transaction(async (tx) => {
    const [plan] = await tx
      .update(fTrainingPlans)
      .set({ status: 'trainer_edited', lastEditedByUserId: input.editedByUserId, lastEditedAt: new Date() })
      .where(eq(fTrainingPlans.id, input.planId))
      .returning();

    const exercises = await replaceExerciseRows(tx, input.planId, input.exercises);
    return { ...plan!, exercises };
  });
}
