import { listExercises } from '@api/modules/catalog/service';
import type { PlanExerciseInput } from '@api/modules/plans/repository';
import * as repository from '@api/modules/plans/repository';

const DEFAULT_EDIT_NOTE = 'Exercises updated';

export function listQueue() {
  return repository.findPlansQueue();
}

export async function getPlan(planId: string) {
  const plan = await repository.findPlanWithMember(planId);
  if (!plan) return null;

  const [exercises, reviews, catalog] = await Promise.all([
    repository.findExercisesForPlanWithDetails(planId),
    repository.findReviewsForPlan(planId),
    listExercises(),
  ]);

  return { plan, exercises, reviews, catalog };
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
