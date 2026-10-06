import type { GymEquipment } from '@api/db/schema';
import { todayLocal } from '@api/lib/dates';
import * as repository from '@api/modules/catalog/repository';
import { findPlannedExerciseRowsFrom } from '@api/modules/plans/repository';
import type { ExerciseMuscle } from '@cadence/shared/schemas/muscles';
import { TRPCError } from '@trpc/server';

// FR-17 / RN-04: an exercise needs no piece of equipment linked to it (bodyweight), or at least one
// linked item must currently be available. Pure so plan generation, plan-resolvability checks, and
// demand aggregation can all reuse it without a query of their own (rules/backend.md).
export function isExerciseAvailable(linkedEquipment: readonly Pick<GymEquipment, 'isAvailable'>[]): boolean {
  return linkedEquipment.length === 0 || linkedEquipment.some((equipment) => equipment.isAvailable);
}

// The pieces an exercise counts toward when demand is tallied per piece: the working ones of an exercise that
// can be done, and the down ones of an exercise that cannot (it has no working alternative left, so those are
// the pieces it is stranded on). A broken piece is never charged for an exercise that has a working alternative.
export function equipmentInUse<Piece extends Pick<GymEquipment, 'isAvailable'>>(
  linkedEquipment: readonly Piece[],
): Piece[] {
  const isAvailable = isExerciseAvailable(linkedEquipment);
  return linkedEquipment.filter((piece) => piece.isAvailable === isAvailable);
}

export async function listExercises() {
  const exercises = await repository.findExercisesWithEquipment();
  return exercises.map((exercise) => ({ ...exercise, isAvailable: isExerciseAvailable(exercise.equipment) }));
}

export function listEquipment() {
  return repository.findAllEquipment();
}

export function createExercise(input: {
  name: string;
  instructions: string;
  muscles: readonly ExerciseMuscle[];
  equipmentIds: readonly string[];
}) {
  return repository.insertExercise(input);
}

export function createEquipment(input: { name: string }) {
  return repository.insertEquipment(input);
}

// The caller states the target, so a repeated or stale click leaves the same state instead of flipping it back.
export function setEquipmentAvailability(id: string, isAvailable: boolean) {
  return repository.setEquipmentAvailability(id, isAvailable);
}

// What switching a piece off would do, so staff confirm with the numbers in front of them. A plan becomes
// must-review when it holds an exercise whose only working equipment is this piece (FR-17); plans of earlier
// dates cannot change any more, so only today and later count.
export async function getEquipmentImpact(equipmentId: string, now: Date = new Date()) {
  const equipment = await repository.findEquipmentById(equipmentId);
  if (!equipment) throw new TRPCError({ code: 'NOT_FOUND', message: 'Equipment not found' });

  const today = todayLocal(now);
  const exercises = (await listExercises()).filter((exercise) =>
    exercise.equipment.some((piece) => piece.id === equipmentId),
  );
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const rows = await findPlannedExerciseRowsFrom(
    exercises.map((exercise) => exercise.id),
    today,
  );

  const newlyBlockedPlans = new Set<string>();
  const affectedMembers = new Set<string>();
  const todayPlans = new Set<string>();
  for (const row of rows) {
    const exercise = exerciseById.get(row.exerciseId)!;
    const working = exercise.equipment.filter((piece) => piece.isAvailable);
    const isOnlyWorkingPiece = equipment.isAvailable && working.length === 1 && working[0]!.id === equipmentId;
    if (isOnlyWorkingPiece) {
      newlyBlockedPlans.add(row.trainingPlanId);
      affectedMembers.add(row.userId);
    }
    if (row.planDate === today && equipmentInUse(exercise.equipment).some((piece) => piece.id === equipmentId)) {
      todayPlans.add(row.trainingPlanId);
    }
  }

  return {
    equipmentId,
    name: equipment.name,
    isAvailable: equipment.isAvailable,
    newlyBlockedPlanCount: newlyBlockedPlans.size,
    todayPlanCount: todayPlans.size,
    affectedMemberCount: affectedMembers.size,
  };
}

export async function setEquipmentLinks(equipmentId: string, exerciseIds: readonly string[]) {
  const equipment = await repository.findEquipmentById(equipmentId);
  if (!equipment) throw new TRPCError({ code: 'NOT_FOUND', message: 'Equipment not found' });

  const uniqueIds = [...new Set(exerciseIds)];
  const existing = await repository.findExistingExerciseIds(uniqueIds);
  if (uniqueIds.some((id) => !existing.has(id))) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'One or more exercises do not exist' });
  }

  await repository.replaceEquipmentLinks(equipmentId, uniqueIds);
  return { equipmentId, exerciseIds: uniqueIds };
}
