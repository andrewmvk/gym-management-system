import { endOfLocalDay, shiftLocalDate, startOfLocalDay, todayLocal } from '@api/lib/dates';
import { equipmentInUse, listEquipment, listExercises } from '@api/modules/catalog/service';
import { findCheckedInMemberIds } from '@api/modules/checkins/repository';
import { findFocusByUserId } from '@api/modules/focus/repository';
import { getMemberContext } from '@api/modules/members/service';
import { findPlanExercisesInRange } from '@api/modules/metrics/repository';
import type { PlanExerciseInput } from '@api/modules/plans/repository';
import * as repository from '@api/modules/plans/repository';
import { computeMuscleLoad } from '@cadence/shared/schemas/muscle-heat';
import type { MuscleId } from '@cadence/shared/schemas/muscles';
import { TRPCError } from '@trpc/server';

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

export const TRAINER_ACTIVITY_WINDOW_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Distinct plans per key, for the plans that appear in the rows. A key without a plan is absent.
function countPlansBy<Key>(
  rows: readonly { trainingPlanId: string; exerciseId: string }[],
  keysOf: (exerciseId: string) => readonly Key[],
  isIncluded: (planId: string) => boolean = () => true,
) {
  const plansByKey = new Map<Key, Set<string>>();
  for (const row of rows) {
    if (!isIncluded(row.trainingPlanId)) continue;
    for (const key of keysOf(row.exerciseId)) {
      plansByKey.set(key, (plansByKey.get(key) ?? new Set()).add(row.trainingPlanId));
    }
  }
  return plansByKey;
}

// The trainers' landing page. Everything here is a fact read off existing rows: which plans hold an
// exercise that cannot be done, how many of today's plans (and how many of those whose member is already
// in the gym) train each muscle or need each piece of equipment, which equipment is down, and who touched
// which plan lately.
export async function getOverview(now: Date = new Date()) {
  const today = todayLocal(now);
  const trainerWindowStart = new Date(now.getTime() - TRAINER_ACTIVITY_WINDOW_DAYS * MS_PER_DAY);
  const [queue, catalog, equipment, [latestActivity], checkedInMemberIds, reviewedPlanIds] = await Promise.all([
    repository.findPlansQueue(),
    listExercises(),
    listEquipment(),
    repository.findRecentReviews(1),
    findCheckedInMemberIds(startOfLocalDay(today), endOfLocalDay(today)),
    repository.findPlanIdsReviewedSince(trainerWindowStart),
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
  const checkedInPlanIds = new Set(
    todayPlans.filter((entry) => checkedInMemberIds.has(entry.userId)).map((entry) => entry.id),
  );
  const isCheckedIn = (planId: string) => checkedInPlanIds.has(planId);

  // Muscles count only exercises that can be done today: one whose equipment is all down is a must-review
  // item, not training the member will get.
  const musclesById = new Map(catalog.filter((e) => e.isAvailable).map((exercise) => [exercise.id, exercise.muscles]));
  const musclesOf = (exerciseId: string) => (musclesById.get(exerciseId) ?? []).map(({ muscle }) => muscle);
  const toCounts = <Key extends string>(plans: Map<Key, Set<string>>) => {
    const counts: Partial<Record<Key, number>> = {};
    for (const [key, set] of plans) counts[key] = set.size;
    return counts;
  };
  const musclePlans: Partial<Record<MuscleId, number>> = toCounts(countPlansBy(rows, musclesOf));
  const muscleCheckedIn: Partial<Record<MuscleId, number>> = toCounts(countPlansBy(rows, musclesOf, isCheckedIn));

  // A plan "needs" a piece in the same sense the muscles use: through an exercise that can be done on it
  // (available exercise, working piece), or, for a piece that is down, through an exercise that has no
  // working alternative left (unavailable exercise, down piece). A down piece therefore still lists the plans
  // it leaves stranded, which is what a trainer weighs before rescheduling them, while an available exercise
  // with a working alternative never counts against the broken piece it also names.
  const equipmentOf = new Map(
    catalog.map((exercise) => [exercise.id, equipmentInUse(exercise.equipment).map((piece) => piece.id)]),
  );
  const piecesOf = (exerciseId: string) => equipmentOf.get(exerciseId) ?? [];
  const plansPerEquipment = countPlansBy(rows, piecesOf);
  const checkedInPlansPerEquipment = countPlansBy(rows, piecesOf, isCheckedIn);
  const equipmentUse = equipment
    .map((piece) => ({
      id: piece.id,
      name: piece.name,
      isAvailable: piece.isAvailable,
      planCount: plansPerEquipment.get(piece.id)?.size ?? 0,
      checkedInCount: checkedInPlansPerEquipment.get(piece.id)?.size ?? 0,
    }))
    .sort(
      (a, b) =>
        Number(a.isAvailable) - Number(b.isAvailable) || b.planCount - a.planCount || a.name.localeCompare(b.name),
    );

  // Plans a trainer touched in the window, by an edit or a note, so the number tracks recent activity
  // instead of growing forever.
  const touchedPlanIds = new Set(reviewedPlanIds);
  for (const entry of queue) {
    if (entry.status === 'trainer_edited' && entry.lastEditedAt && entry.lastEditedAt >= trainerWindowStart) {
      touchedPlanIds.add(entry.id);
    }
  }

  return {
    today,
    planCount: todayPlans.length,
    checkedInPlanCount: checkedInPlanIds.size,
    musclePlans,
    muscleCheckedIn,
    equipment: equipmentUse,
    needsReview,
    trainerActivity: {
      planCount: touchedPlanIds.size,
      windowDays: TRAINER_ACTIVITY_WINDOW_DAYS,
      latest: latestActivity ?? null,
    },
  };
}

// What a trainer compares a plan against: the member's completed work in the days before the plan.
export const RECENT_MUSCLE_WINDOW_DAYS = 14;

export async function getPlan(planId: string) {
  const plan = await repository.findPlanWithMember(planId);
  if (!plan) return null;

  const [exercises, reviews, catalog, recentExercises, muscleFocus, memberContext] = await Promise.all([
    repository.findExercisesForPlanWithDetails(planId),
    repository.findReviewsForPlan(planId),
    listExercises(),
    findPlanExercisesInRange(
      plan.userId,
      shiftLocalDate(plan.planDate, -RECENT_MUSCLE_WINDOW_DAYS),
      shiftLocalDate(plan.planDate, -1),
    ),
    findFocusByUserId(plan.userId),
    getMemberContext(plan.userId),
  ]);

  const recentMuscleLoad = computeMuscleLoad(recentExercises.filter((exercise) => exercise.completed));
  const blocked = plan.planDate >= todayLocal() ? ((await findBlockedByPlan([planId], catalog)).get(planId) ?? []) : [];
  return { plan, exercises, reviews, catalog, recentMuscleLoad, muscleFocus, blocked, memberContext };
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
  if (plan.planDate < todayLocal())
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Past plans cannot be edited' });

  const updated = await repository.editPlanExercises({ planId, exercises, editedByUserId: userId });
  await repository.insertReview({
    trainingPlanId: planId,
    userId,
    note: note?.trim() || DEFAULT_EDIT_NOTE,
    isEdit: true,
  });
  return updated;
}
