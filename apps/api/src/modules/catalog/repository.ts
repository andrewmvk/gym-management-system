import { type DatabaseExecutor, db } from '@api/db/client';
import { dExerciseEquipment, dExerciseMuscles, dExercises, dGymEquipment } from '@api/db/schema';
import type { ExerciseMuscle } from '@cadence/shared/schemas/muscles';
import { asc, eq, inArray } from 'drizzle-orm';

export async function findExercisesWithEquipment(executor: DatabaseExecutor = db) {
  const exercises = await executor.select().from(dExercises).orderBy(asc(dExercises.name));
  const [links, muscleRows] = await Promise.all([
    executor
      .select({
        exerciseId: dExerciseEquipment.exerciseId,
        equipment: dGymEquipment,
      })
      .from(dExerciseEquipment)
      .innerJoin(dGymEquipment, eq(dGymEquipment.id, dExerciseEquipment.equipmentId)),
    executor.select().from(dExerciseMuscles),
  ]);

  return exercises.map((exercise) => ({
    ...exercise,
    equipment: links.filter((link) => link.exerciseId === exercise.id).map((link) => link.equipment),
    muscles: muscleRows
      .filter((row) => row.exerciseId === exercise.id)
      .map((row): ExerciseMuscle => ({ muscle: row.muscle, role: row.role })),
  }));
}

export async function findMusclesByExerciseIds(
  exerciseIds: readonly string[],
  executor: DatabaseExecutor = db,
): Promise<Map<string, ExerciseMuscle[]>> {
  const byExercise = new Map<string, ExerciseMuscle[]>();
  if (exerciseIds.length === 0) return byExercise;
  const rows = await executor
    .select()
    .from(dExerciseMuscles)
    .where(inArray(dExerciseMuscles.exerciseId, [...exerciseIds]));
  for (const row of rows) {
    byExercise.set(row.exerciseId, [...(byExercise.get(row.exerciseId) ?? []), { muscle: row.muscle, role: row.role }]);
  }
  return byExercise;
}

export function findAllEquipment(executor: DatabaseExecutor = db) {
  return executor.select().from(dGymEquipment).orderBy(asc(dGymEquipment.name));
}

export async function findEquipmentById(id: string, executor: DatabaseExecutor = db) {
  const [equipment] = await executor.select().from(dGymEquipment).where(eq(dGymEquipment.id, id));
  return equipment ?? null;
}

export function insertExercise(input: {
  name: string;
  instructions: string;
  muscles: readonly ExerciseMuscle[];
  equipmentIds: readonly string[];
}) {
  return db.transaction(async (tx) => {
    const [exercise] = await tx
      .insert(dExercises)
      .values({ name: input.name, instructions: input.instructions })
      .returning();
    await tx
      .insert(dExerciseMuscles)
      .values(input.muscles.map(({ muscle, role }) => ({ exerciseId: exercise!.id, muscle, role })));
    if (input.equipmentIds.length > 0) {
      await tx
        .insert(dExerciseEquipment)
        .values(input.equipmentIds.map((equipmentId) => ({ exerciseId: exercise!.id, equipmentId })));
    }
    return exercise!;
  });
}

export async function insertEquipment(input: { name: string }, executor: DatabaseExecutor = db) {
  const [equipment] = await executor.insert(dGymEquipment).values({ name: input.name }).returning();
  return equipment!;
}

export async function setEquipmentAvailability(id: string, isAvailable: boolean, executor: DatabaseExecutor = db) {
  const [equipment] = await executor
    .update(dGymEquipment)
    .set({ isAvailable })
    .where(eq(dGymEquipment.id, id))
    .returning();
  return equipment ?? null;
}
