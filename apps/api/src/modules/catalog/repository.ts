import { asc, eq } from 'drizzle-orm';
import { db, type DatabaseExecutor } from '@api/db/client';
import { dExerciseEquipment, dExercises, dGymEquipment } from '@api/db/schema';

export async function findExercisesWithEquipment(executor: DatabaseExecutor = db) {
  const exercises = await executor.select().from(dExercises).orderBy(asc(dExercises.name));
  const links = await executor
    .select({
      exerciseId: dExerciseEquipment.exerciseId,
      equipment: dGymEquipment,
    })
    .from(dExerciseEquipment)
    .innerJoin(dGymEquipment, eq(dGymEquipment.id, dExerciseEquipment.equipmentId));

  return exercises.map((exercise) => ({
    ...exercise,
    equipment: links.filter((link) => link.exerciseId === exercise.id).map((link) => link.equipment),
  }));
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
  muscleGroup: string;
  instructions: string;
  equipmentIds: readonly string[];
}) {
  return db.transaction(async (tx) => {
    const [exercise] = await tx
      .insert(dExercises)
      .values({ name: input.name, muscleGroup: input.muscleGroup, instructions: input.instructions })
      .returning();
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
