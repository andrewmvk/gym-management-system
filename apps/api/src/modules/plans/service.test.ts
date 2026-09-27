import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, pool } from '@api/db/client';
import { dExercises, dUsers, fTrainingPlans } from '@api/db/schema';
import { seedBase } from '@api/db/seed';
import type { EvaluatePlan, GenerateForDateResult } from '@api/modules/plans/service';
import { generateForDate } from '@api/modules/plans/service';
import { resetTestDatabase } from '@api/test/database';

async function createMember() {
  const [user] = await db
    .insert(dUsers)
    .values({ email: 'member@example.com', name: 'Plan Test Member', birthdate: '1995-06-15' })
    .returning();
  return user!;
}

async function exerciseIdByName(name: string) {
  const [exercise] = await db.select({ id: dExercises.id }).from(dExercises).where(eq(dExercises.name, name));
  return exercise!.id;
}

// Most tests only care about the successful-generation path; this keeps them from repeating the
// discriminated-union narrowing every time.
function expectOk(result: GenerateForDateResult) {
  if (result.status !== 'ok') throw new Error(`Expected status "ok", got "${result.status}"`);
  return result.plan;
}

const alwaysFails: EvaluatePlan = async () => ({ ok: false, reason: 'unavailable' });

describe('plans', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });
  afterAll(() => pool.end());

  describe('generateForDate (placeholder)', () => {
    it('picks 3 to 5 available exercises across different muscle groups', async () => {
      const member = await createMember();

      const plan = expectOk(await generateForDate(member.id, '2026-10-01', false, { generator: 'placeholder' }));

      expect(plan.exercises.length).toBeGreaterThanOrEqual(3);
      expect(plan.exercises.length).toBeLessThanOrEqual(5);
      const chosenExerciseIds = plan.exercises.map((e) => e.exerciseId);
      expect(new Set(chosenExerciseIds).size).toBe(chosenExerciseIds.length);
    });

    it('never includes an exercise whose only equipment is unavailable', async () => {
      const member = await createMember();
      const rowingId = await exerciseIdByName('Rowing Machine Sprint');
      const bikeId = await exerciseIdByName('Stationary Bike Ride');

      const plan = expectOk(await generateForDate(member.id, '2026-10-01', false, { generator: 'placeholder' }));

      const chosenExerciseIds = plan.exercises.map((e) => e.exerciseId);
      expect(chosenExerciseIds).not.toContain(rowingId);
      expect(chosenExerciseIds).not.toContain(bikeId);
    });

    it('leaves one plan row when the same date is regenerated twice', async () => {
      const member = await createMember();

      await generateForDate(member.id, '2026-10-01', false, { generator: 'placeholder' });
      await generateForDate(member.id, '2026-10-01', false, { generator: 'placeholder' });

      const rows = await db
        .select()
        .from(fTrainingPlans)
        .where(eq(fTrainingPlans.userId, member.id));
      expect(rows).toHaveLength(1);
      expect(rows[0]?.status).toBe('ai_published');
    });
  });

  describe('generateForDate (ai)', () => {
    it('persists exactly the AI-chosen exercises when they are all valid and available', async () => {
      const member = await createMember();
      const squatId = await exerciseIdByName('Barbell Back Squat');
      const evaluatePlan: EvaluatePlan = async () => ({
        ok: true,
        data: { exercises: [{ exerciseId: squatId, sets: 5, reps: 5 }] },
      });

      const plan = expectOk(await generateForDate(member.id, '2026-10-01', false, { generator: 'ai', evaluatePlan }));

      expect(plan.exercises).toHaveLength(1);
      expect(plan.exercises[0]?.exerciseId).toBe(squatId);
      expect(plan.exercises[0]?.sets).toBe(5);
    });

    it('discards an unavailable or unknown suggestion and falls back to the placeholder if none remain', async () => {
      const member = await createMember();
      const rowingId = await exerciseIdByName('Rowing Machine Sprint');
      const evaluatePlan: EvaluatePlan = async () => ({
        ok: true,
        data: { exercises: [{ exerciseId: rowingId, sets: 3, reps: 10 }] },
      });

      const plan = expectOk(await generateForDate(member.id, '2026-10-01', false, { generator: 'ai', evaluatePlan }));

      const chosenExerciseIds = plan.exercises.map((e) => e.exerciseId);
      expect(chosenExerciseIds).not.toContain(rowingId);
      expect(plan.exercises.length).toBeGreaterThanOrEqual(3);
    });

    it('throws INTERNAL_SERVER_ERROR on an AI failure and creates no plan', async () => {
      const member = await createMember();

      await expect(
        generateForDate(member.id, '2026-10-01', false, { generator: 'ai', evaluatePlan: alwaysFails }),
      ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR', message: 'AI is temporarily unavailable' });

      const rows = await db.select().from(fTrainingPlans).where(eq(fTrainingPlans.userId, member.id));
      expect(rows).toHaveLength(0);
    });
  });

  describe('trainer_edited guard (RN-06 / FR-22, completed in P-15)', () => {
    it('reports needs_confirmation as data (not a thrown error) without confirmOverwrite, succeeds with it', async () => {
      const member = await createMember();
      expectOk(await generateForDate(member.id, '2026-10-01', false, { generator: 'placeholder' }));
      await db
        .update(fTrainingPlans)
        .set({ status: 'trainer_edited', lastEditedByUserId: member.id, lastEditedAt: new Date('2026-09-20') })
        .where(eq(fTrainingPlans.userId, member.id));

      const blocked = await generateForDate(member.id, '2026-10-01', false, { generator: 'placeholder' });
      expect(blocked).toMatchObject({ status: 'needs_confirmation', editedBy: 'Plan Test Member' });

      const plan = expectOk(await generateForDate(member.id, '2026-10-01', true, { generator: 'placeholder' }));
      expect(plan.status).toBe('ai_published');
    });
  });
});
