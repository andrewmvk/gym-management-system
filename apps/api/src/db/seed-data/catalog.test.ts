import { count, eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, pool } from '@api/db/client';
import { dExerciseEquipment, dExercises, dGymEquipment } from '@api/db/schema';
import { seedBase } from '@api/db/seed';
import { resetTestDatabase } from '@api/test/database';

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

  it('does not undo a later toggle of an equipment item when re-run', async () => {
    await seedBase();
    const [barbell] = await db.select().from(dGymEquipment).where(eq(dGymEquipment.name, 'Barbell'));
    await db.update(dGymEquipment).set({ isAvailable: false }).where(eq(dGymEquipment.id, barbell!.id));

    await seedBase();

    const [reloaded] = await db.select().from(dGymEquipment).where(eq(dGymEquipment.id, barbell!.id));
    expect(reloaded?.isAvailable).toBe(false);
  });
});
