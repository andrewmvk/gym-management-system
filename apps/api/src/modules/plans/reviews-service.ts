import { localDateString, todayLocal } from '@api/lib/dates';
import { listEquipment, listExercises } from '@api/modules/catalog/service';
import { findFocusByUserId } from '@api/modules/focus/repository';
import { findPlanExercisesInRange } from '@api/modules/metrics/repository';
import type { PlanExerciseInput } from '@api/modules/plans/repository';
import * as repository from '@api/modules/plans/repository';
import { computeMuscleLoad } from '@cadence/shared/schemas/muscle-heat';
import type { MuscleId } from '@cadence/shared/schemas/muscles';

const DEFAULT_EDIT_NOTE = 'Exercises updated';

type CatalogEntry = Awaited<ReturnType<typeof listExercises>>[number];

export interface BlockedExercise {
  exerciseId: string;
  name: string;
  equipmentDown: string[];
}

// An exercise that cannot be done right now (FR-17) makes its plan a must-review one, but only while
// the plan can still change: today or a later date. Derived on every read like isPerformable, so it
// clears by itself once the plan is edited, rebuilt or the equipment comes back.
async function findBlockedByPlan(planIds: readonly string[], catalog: readonly CatalogEntry[]) {
  const rows = await repository.findExerciseRowsForPlans(planIds);
  const byId = new Map(catalog.map((exercise) => [exercise.id, exercise]));
  const blocked = new Map<string, BlockedExercise[]>();
  for (const row of rows) {
    const exercise = byId.get(row.exerciseId);
    if (!exercise || exercise.isAvailable) continue;
    const entry: BlockedExercise = {
      exerciseId: exercise.id,
      name: exercise.name,
      equipmentDown: exercise.equipment.filter((item) => !item.isAvailable).map((item) => item.name),
    };
    blocked.set(row.trainingPlanId, [...(blocked.get(row.trainingPlanId) ?? []), entry]);
  }
  return blocked;
}

export async function listQueue(now: Date = new Date()) {
  const [queue, catalog] = await Promise.all([repository.findPlansQueue(), listExercises()]);
  const today = todayLocal(now);
  const blocked = await findBlockedByPlan(
    queue.filter((entry) => entry.planDate >= today).map((entry) => entry.id),
    catalog,
  );
  return queue.map((entry) => {
    const unavailableCount = blocked.get(entry.id)?.length ?? 0;
    return { ...entry, needsReview: unavailableCount > 0, unavailableCount };
  });
}

// The trainers' landing page. Everything here is a fact read off existing rows: which plans hold an
// exercise that cannot be done, how many of today's plans train each muscle, which equipment is down,
// and who already touched which plan.
export async function getOverview(now: Date = new Date()) {
  const today = todayLocal(now);
  const [queue, catalog, equipment, [latestActivity]] = await Promise.all([
    repository.findPlansQueue(),
    listExercises(),
    listEquipment(),
    repository.findRecentReviews(1),
  ]);

  const upcoming = queue.filter((entry) => entry.planDate >= today);
  const blocked = await findBlockedByPlan(
    upcoming.map((entry) => entry.id),
    catalog,
  );
  const needsReview = upcoming
    .filter((entry) => blocked.has(entry.id))
    .map((entry) => ({
      planId: entry.id,
      memberName: entry.memberName,
      planDate: entry.planDate,
      status: entry.status,
      blocked: blocked.get(entry.id)!,
    }))
    .sort((a, b) => a.planDate.localeCompare(b.planDate) || a.memberName.localeCompare(b.memberName));

  const todayPlans = upcoming.filter((entry) => entry.planDate === today);
  const rows = await repository.findExerciseRowsForPlans(todayPlans.map((entry) => entry.id));
  const musclesById = new Map(catalog.filter((e) => e.isAvailable).map((exercise) => [exercise.id, exercise.muscles]));
  const plansPerMuscle = new Map<MuscleId, Set<string>>();
  for (const row of rows) {
    for (const { muscle } of musclesById.get(row.exerciseId) ?? []) {
      plansPerMuscle.set(muscle, (plansPerMuscle.get(muscle) ?? new Set()).add(row.trainingPlanId));
    }
  }
  const musclePlans: Partial<Record<MuscleId, number>> = {};
  for (const [muscle, plans] of plansPerMuscle) musclePlans[muscle] = plans.size;

  // How many of today's plans hold an exercise that uses each piece, whether or not the piece is running.
  const equipmentByExercise = new Map(catalog.map((exercise) => [exercise.id, exercise.equipment]));
  const plansPerEquipment = new Map<string, Set<string>>();
  for (const row of rows) {
    for (const piece of equipmentByExercise.get(row.exerciseId) ?? []) {
      plansPerEquipment.set(piece.id, (plansPerEquipment.get(piece.id) ?? new Set()).add(row.trainingPlanId));
    }
  }
  const equipmentUse = equipment
    .map((piece) => ({
      id: piece.id,
      name: piece.name,
      isAvailable: piece.isAvailable,
      planCount: plansPerEquipment.get(piece.id)?.size ?? 0,
    }))
    .sort(
      (a, b) =>
        Number(a.isAvailable) - Number(b.isAvailable) || b.planCount - a.planCount || a.name.localeCompare(b.name),
    );

  // Plans a trainer touched, by an edit or a note: the same set the reviews queue shows under its trainer tab.
  const trainerPlanCount = queue.filter((entry) => entry.status === 'trainer_edited' || entry.noteCount > 0).length;

  return {
    today,
    planCount: todayPlans.length,
    musclePlans,
    equipment: equipmentUse,
    needsReview,
    trainerActivity: { planCount: trainerPlanCount, latest: latestActivity ?? null },
  };
}

// What a trainer compares a plan against: the member's completed work in the days before the plan.
export const RECENT_MUSCLE_WINDOW_DAYS = 14;

function shiftDate(date: string, days: number) {
  const shifted = new Date(`${date}T12:00:00`);
  shifted.setDate(shifted.getDate() + days);
  return localDateString(shifted);
}

export async function getPlan(planId: string) {
  const plan = await repository.findPlanWithMember(planId);
  if (!plan) return null;

  const [exercises, reviews, catalog, recentExercises, muscleFocus] = await Promise.all([
    repository.findExercisesForPlanWithDetails(planId),
    repository.findReviewsForPlan(planId),
    listExercises(),
    findPlanExercisesInRange(
      plan.userId,
      shiftDate(plan.planDate, -RECENT_MUSCLE_WINDOW_DAYS),
      shiftDate(plan.planDate, -1),
    ),
    findFocusByUserId(plan.userId),
  ]);

  const recentMuscleLoad = computeMuscleLoad(recentExercises.filter((exercise) => exercise.completed));
  const blocked = plan.planDate >= todayLocal() ? ((await findBlockedByPlan([planId], catalog)).get(planId) ?? []) : [];
  return { plan, exercises, reviews, catalog, recentMuscleLoad, muscleFocus, blocked };
}

// FR-19: every note is its own row, in order - never overwrites an earlier trainer's note.
export async function addNote(planId: string, userId: string, note: string) {
  const plan = await repository.findPlanWithMember(planId);
  if (!plan) return null;
  return repository.insertReview({ trainingPlanId: planId, userId, note, isEdit: false });
}

// FR-19: a direct edit flips the plan to trainer_edited and is also recorded as a review entry
// (is_edit true), so the history reads as one continuous timeline of comments and edits.
export async function editPlan(planId: string, userId: string, exercises: PlanExerciseInput[], note?: string) {
  const plan = await repository.findPlanWithMember(planId);
  if (!plan) return null;

  const updated = await repository.editPlanExercises({ planId, exercises, editedByUserId: userId });
  await repository.insertReview({
    trainingPlanId: planId,
    userId,
    note: note?.trim() || DEFAULT_EDIT_NOTE,
    isEdit: true,
  });
  return updated;
}
