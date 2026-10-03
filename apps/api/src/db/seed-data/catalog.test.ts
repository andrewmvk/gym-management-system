import { db, pool } from '@api/db/client';
import { dExerciseEquipment, dExerciseMuscles, dExercises, dGymEquipment } from '@api/db/schema';
import { seedBase } from '@api/db/seed';
import { resetTestDatabase } from '@api/test/database';
import { count, eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

async function rowCounts() {
  const [[exercises], [equipment], [links]] = await Promise.all([
    db.select({ value: count() }).from(dExercises),
    db.select({ value: count() }).from(dGymEquipment),
    db.select({ value: count() }).from(dExerciseEquipment),
  ]);
  return { exercises: exercises!.value, equipment: equipment!.value, links: links!.value };
}

describe('seedCatalog', () => {
  beforeEach(resetTestDatabase);
  afterAll(() => pool.end());

  it('is idempotent', async () => {
    await seedBase();
    const first = await rowCounts();
    await seedBase();

    expect(await rowCounts()).toEqual(first);
    expect(first.exercises).toBeGreaterThanOrEqual(25);
    expect(first.equipment).toBeGreaterThanOrEqual(12);
  });

  it('seeds about a third of the exercises with no equipment at all', async () => {
    await seedBase();

    const exercises = await db.select({ id: dExercises.id }).from(dExercises);
    const linked = await db.select({ exerciseId: dExerciseEquipment.exerciseId }).from(dExerciseEquipment);
    const linkedIds = new Set(linked.map((row) => row.exerciseId));
    const withoutEquipment = exercises.filter((exercise) => !linkedIds.has(exercise.id));

    expect(withoutEquipment.length).toBeGreaterThan(0);
    expect(withoutEquipment.length).toBeLessThan(exercises.length);
  });

  it('gives every exercise at least one primary muscle', async () => {
    await seedBase();

    const exercises = await db.select({ id: dExercises.id }).from(dExercises);
    const primaries = await db
      .select({ exerciseId: dExerciseMuscles.exerciseId })
      .from(dExerciseMuscles)
      .where(eq(dExerciseMuscles.role, 'primary'));
    const withPrimary = new Set(primaries.map((row) => row.exerciseId));

    expect(exercises.filter((exercise) => !withPrimary.has(exercise.id))).toEqual([]);
  });

  it('fills in the muscle map of an exercise that has none, without touching other rows', async () => {
    await seedBase();
    const [squat] = await db.select().from(dExercises).where(eq(dExercises.name, 'Bodyweight Squat'));
    await db.delete(dExerciseMuscles).where(eq(dExerciseMuscles.exerciseId, squat!.id));
    const before = await db.select().from(dExerciseMuscles);

    await seedBase();

    const after = await db.select().from(dExerciseMuscles);
    expect(after.length).toBeGreaterThan(before.length);
    expect(after.some((row) => row.exerciseId === squat!.id && row.role === 'primary')).toBe(true);
  });

  it('does not undo a later toggle of an equipment item when re-run', async () => {
    await seedBase();
    const [barbell] = await db.select().from(dGymEquipment).where(eq(dGymEquipment.name, 'Barbell'));
    await db.update(dGymEquipment).set({ isAvailable: false }).where(eq(dGymEquipment.id, barbell!.id));

    await seedBase();

    const [reloaded] = await db.select().from(dGymEquipment).where(eq(dGymEquipment.id, barbell!.id));
    expect(reloaded?.isAvailable).toBe(false);
  });
});
