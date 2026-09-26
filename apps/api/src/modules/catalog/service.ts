import type { GymEquipment } from '@api/db/schema';
import * as repository from '@api/modules/catalog/repository';

// FR-17 / RN-04: an exercise needs no piece of equipment linked to it (bodyweight), or at least one
// linked item must currently be available. Pure so plan generation, plan-resolvability checks, and
// demand aggregation can all reuse it without a query of their own (rules/backend.md).
export function isExerciseAvailable(linkedEquipment: readonly Pick<GymEquipment, 'isAvailable'>[]): boolean {
  return linkedEquipment.length === 0 || linkedEquipment.some((equipment) => equipment.isAvailable);
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
  muscleGroup: string;
  instructions: string;
  equipmentIds: readonly string[];
}) {
  return repository.insertExercise(input);
}

export function createEquipment(input: { name: string }) {
  return repository.insertEquipment(input);
}

export async function toggleEquipmentAvailability(id: string) {
  const existing = await repository.findEquipmentById(id);
  if (!existing) return null;
  return repository.setEquipmentAvailability(id, !existing.isAvailable);
}
