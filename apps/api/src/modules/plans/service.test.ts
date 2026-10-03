import { db, pool } from '@api/db/client';
import { dExercises, dUsers, fTrainingPlanExercises, fTrainingPlans } from '@api/db/schema';
import { seedBase } from '@api/db/seed';
import { todayLocal } from '@api/lib/dates';
import type { EvaluatePlan, GenerateForDateResult } from '@api/modules/plans/service';
import { generateForDate, generatePlaceholderExercises, getTodayAggregate } from '@api/modules/plans/service';
import { resetTestDatabase } from '@api/test/database';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

async function createMember(email = 'member@example.com') {
  const [user] = await db
    .insert(dUsers)
    .values({ email, name: 'Plan Test Member', birthdate: '1995-06-15' })
    .returning();
  return user!;
}

async function createPlanWithExercises(userId: string, planDate: string, exerciseNames: readonly string[]) {
  const [plan] = await db
    .insert(fTrainingPlans)
    .values({ userId, planDate, status: 'ai_published', aiGeneratedAt: new Date() })
    .returning();
  await Promise.all(
    exerciseNames.map(async (name, index) => {
      const exerciseId = await exerciseIdByName(name);
      await db
        .insert(fTrainingPlanExercises)
        .values({ trainingPlanId: plan!.id, exerciseId, sets: 3, reps: 10, orderIndex: index });
    }),
  );
  return plan!;
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

      const rows = await db.select().from(fTrainingPlans).where(eq(fTrainingPlans.userId, member.id));
      expect(rows).toHaveLength(1);
      expect(rows[0]?.status).toBe('ai_published');
    });
  });

  describe('generatePlaceholderExercises', () => {
    const chestPress = {
      id: 'chest-press',
      name: 'Chest Press',
      muscles: [{ muscle: 'chest', role: 'primary' }],
    } as const;
    const row = { id: 'row', name: 'Row', muscles: [{ muscle: 'lats', role: 'primary' }] } as const;
    const squat = { id: 'squat', name: 'Squat', muscles: [{ muscle: 'quads', role: 'primary' }] } as const;
    const curl = { id: 'curl', name: 'Curl', muscles: [{ muscle: 'biceps', role: 'primary' }] } as const;
    const exercises = [chestPress, row, squat, curl];

    it('orders groups by muscle focus and adds a set to emphasized muscles', () => {
      const picked = generatePlaceholderExercises(exercises, [{ muscle: 'quads', bias: 2 }]);

      expect(picked[0]).toMatchObject({ exerciseId: 'squat', sets: 4 });
    });

    it('takes a set off a muscle set to less', () => {
      const picked = generatePlaceholderExercises(exercises, [{ muscle: 'chest', bias: -1 }]);

      expect(picked.find((entry) => entry.exerciseId === 'chest-press')?.sets).toBe(2);
    });

    it('leaves out an exercise whose primary muscle is set to much less', () => {
      const picked = generatePlaceholderExercises(exercises, [{ muscle: 'biceps', bias: -2 }]);

      expect(picked.map((entry) => entry.exerciseId)).not.toContain('curl');
    });

    it('still builds a plan when every exercise is set to much less', () => {
      const picked = generatePlaceholderExercises(
        exercises,
        exercises.map((exercise) => ({ muscle: exercise.muscles[0].muscle, bias: -2 })),
      );

      expect(picked.length).toBeGreaterThan(0);
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

  describe('getTodayAggregate', () => {
    it('counts exercises and muscle groups across every member, with no identifying field', async () => {
      const today = todayLocal();
      const memberA = await createMember('aggregate-a@example.com');
      const memberB = await createMember('aggregate-b@example.com');
      const memberC = await createMember('aggregate-c@example.com');
      await createPlanWithExercises(memberA.id, today, ['Barbell Back Squat', 'Push-Up']);
      await createPlanWithExercises(memberB.id, today, ['Barbell Back Squat', 'Push-Up']);
      await createPlanWithExercises(memberC.id, today, ['Push-Up', 'Plank']);
      // A different date must never contribute to today's aggregate.
      await createPlanWithExercises(memberA.id, '2020-01-01', ['Pull-Up']);

      const aggregate = await getTodayAggregate();

      expect(aggregate.topExercises).toEqual([
        { name: 'Push-Up', count: 3 },
        { name: 'Barbell Back Squat', count: 2 },
        { name: 'Plank', count: 1 },
      ]);
      expect(aggregate.topMuscles.slice(0, 3)).toEqual([
        { name: 'Chest', count: 9 },
        { name: 'Abs', count: 7.5 },
        { name: 'Front delts', count: 6 },
      ]);
      expect(JSON.stringify(aggregate)).not.toContain(memberA.id);
      expect(JSON.stringify(aggregate)).not.toContain('aggregate-a@example.com');
    });

    it('caps at the top 10 exercises and top 5 muscles', async () => {
      const today = todayLocal();
      const member = await createMember();
      // 12 distinct exercises (caps topExercises at 10) that together train far more than 5 muscles.
      const allExerciseNames = [
        'Bodyweight Squat',
        'Barbell Back Squat',
        'Leg Press',
        'Push-Up',
        'Barbell Bench Press',
        'Pull-Up',
        'Bent-Over Barbell Row',
        'Overhead Dumbbell Press',
        'Diamond Push-Up',
        'Plank',
        'Bicycle Crunch',
        'Treadmill Run',
      ];
      await createPlanWithExercises(member.id, today, allExerciseNames);

      const aggregate = await getTodayAggregate();

      expect(aggregate.topExercises).toHaveLength(10);
      expect(aggregate.topMuscles).toHaveLength(5);
      const counts = aggregate.topMuscles.map((muscle) => muscle.count);
      expect(counts).toEqual([...counts].sort((a, b) => b - a));
    });

    it('returns empty lists when no plan exists for today', async () => {
      const aggregate = await getTodayAggregate();

      expect(aggregate).toEqual({ topExercises: [], topMuscles: [] });
    });
  });
});
