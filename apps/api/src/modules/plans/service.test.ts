import { db, pool } from '@api/db/client';
import {
  dExercises,
  dUsers,
  fCheckIns,
  fOnboardingSubmissions,
  fPlanReviews,
  fProfileEvents,
  fTrainingPlanExercises,
  fTrainingPlans,
} from '@api/db/schema';
import { SEED_TRAINER_EMAIL, seedBase } from '@api/db/seed';
import { localDateString, todayLocal } from '@api/lib/dates';
import { editPlan } from '@api/modules/plans/reviews-service';
import type { EvaluatePlan, GenerateForDateResult } from '@api/modules/plans/service';
import {
  buildDemandLines,
  computePlanDemand,
  generateForDate,
  generatePlaceholderExercises,
  getPlanForDate,
  getTodayAggregate,
  listPlanDays,
} from '@api/modules/plans/service';
import { resetTestDatabase } from '@api/test/database';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

function dateOffset(date: string, days: number) {
  const shifted = new Date(`${date}T12:00:00`);
  shifted.setDate(shifted.getDate() + days);
  return localDateString(shifted);
}

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

    it('picks one exercise per lead muscle in registry order, three sets each', () => {
      const picked = generatePlaceholderExercises(exercises);

      expect(picked.map((entry) => entry.exerciseId)).toEqual(['chest-press', 'curl', 'row', 'squat']);
      expect(picked.every((entry) => entry.sets === 3)).toBe(true);
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

    it('drops an unavailable suggestion but keeps the valid ones', async () => {
      const member = await createMember();
      const rowingId = await exerciseIdByName('Rowing Machine Sprint');
      const squatId = await exerciseIdByName('Barbell Back Squat');
      const evaluatePlan: EvaluatePlan = async () => ({
        ok: true,
        data: {
          exercises: [
            { exerciseId: rowingId, sets: 3, reps: 10 },
            { exerciseId: squatId, sets: 3, reps: 10 },
          ],
        },
      });

      const plan = expectOk(await generateForDate(member.id, '2026-10-01', false, { generator: 'ai', evaluatePlan }));

      expect(plan.exercises.map((e) => e.exerciseId)).toEqual([squatId]);
    });

    it('throws instead of publishing a placeholder when the AI returns no usable catalog exercise', async () => {
      const member = await createMember();
      const rowingId = await exerciseIdByName('Rowing Machine Sprint');
      const unusable: EvaluatePlan[] = [
        async () => ({ ok: true, data: { exercises: [{ exerciseId: rowingId, sets: 3, reps: 10 }] } }),
        async () => ({ ok: true, data: { exercises: [] } }),
      ];

      for (const evaluatePlan of unusable) {
        await expect(
          generateForDate(member.id, '2026-10-01', false, { generator: 'ai', evaluatePlan }),
        ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR', message: 'AI is temporarily unavailable' });
      }

      const rows = await db.select().from(fTrainingPlans).where(eq(fTrainingPlans.userId, member.id));
      expect(rows).toHaveLength(0);
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
      expect(blocked).toMatchObject({
        status: 'needs_confirmation',
        reason: 'trainer_edited',
        editedBy: 'Plan Test Member',
      });

      const plan = expectOk(await generateForDate(member.id, '2026-10-01', true, { generator: 'placeholder' }));
      expect(plan.status).toBe('ai_published');
    });
  });

  describe('ticked exercises', () => {
    async function tick(planId: string, exerciseName: string) {
      await db
        .update(fTrainingPlanExercises)
        .set({ completed: true })
        .where(
          and(
            eq(fTrainingPlanExercises.trainingPlanId, planId),
            eq(fTrainingPlanExercises.exerciseId, await exerciseIdByName(exerciseName)),
          ),
        );
    }

    it('asks for confirmation instead of regenerating a plan that has ticked exercises', async () => {
      const member = await createMember();
      const plan = await createPlanWithExercises(member.id, '2026-10-01', ['Barbell Back Squat', 'Push-Up']);
      await tick(plan.id, 'Barbell Back Squat');

      const result = await generateForDate(member.id, '2026-10-01', false, { generator: 'placeholder' });

      expect(result).toMatchObject({
        status: 'needs_confirmation',
        reason: 'has_completed',
        editedBy: null,
        editedAt: null,
        completedCount: 1,
      });
      const rows = await db
        .select()
        .from(fTrainingPlanExercises)
        .where(eq(fTrainingPlanExercises.trainingPlanId, plan.id));
      expect(rows).toHaveLength(2);
    });

    it('keeps the tick of an exercise that stays in a confirmed regeneration', async () => {
      const member = await createMember();
      const plan = await createPlanWithExercises(member.id, '2026-10-01', ['Barbell Back Squat', 'Push-Up']);
      await tick(plan.id, 'Barbell Back Squat');
      await tick(plan.id, 'Push-Up');
      const squatId = await exerciseIdByName('Barbell Back Squat');
      const plankId = await exerciseIdByName('Plank');
      const evaluatePlan: EvaluatePlan = async () => ({
        ok: true,
        data: {
          exercises: [
            { exerciseId: squatId, sets: 4, reps: 6 },
            { exerciseId: plankId, sets: 3, reps: 30 },
          ],
        },
      });

      const regenerated = expectOk(
        await generateForDate(member.id, '2026-10-01', true, { generator: 'ai', evaluatePlan }),
      );

      const byExercise = new Map(regenerated.exercises.map((exercise) => [exercise.exerciseId, exercise]));
      expect(byExercise.get(squatId)).toMatchObject({ sets: 4, completed: true });
      expect(byExercise.get(plankId)?.completed).toBe(false);
      expect(regenerated.exercises).toHaveLength(2);
    });

    it('keeps the ticks of the exercises a trainer leaves in the plan', async () => {
      const member = await createMember();
      const trainer = await createMember('ticks-trainer@example.com');
      const today = todayLocal();
      const plan = await createPlanWithExercises(member.id, today, ['Barbell Back Squat', 'Push-Up']);
      await tick(plan.id, 'Barbell Back Squat');
      const squatId = await exerciseIdByName('Barbell Back Squat');
      const plankId = await exerciseIdByName('Plank');

      const edited = await editPlan(plan.id, trainer.id, [
        { exerciseId: squatId, sets: 5, reps: 5 },
        { exerciseId: plankId, sets: 3, reps: 30 },
      ]);

      const byExercise = new Map(edited!.exercises.map((exercise) => [exercise.exerciseId, exercise]));
      expect(byExercise.get(squatId)).toMatchObject({ sets: 5, completed: true });
      expect(byExercise.get(plankId)?.completed).toBe(false);
    });

    it('refuses a trainer edit of a plan dated before today', async () => {
      const member = await createMember();
      const trainer = await createMember('past-trainer@example.com');
      const plan = await createPlanWithExercises(member.id, '2020-01-01', ['Push-Up']);

      await expect(
        editPlan(plan.id, trainer.id, [{ exerciseId: await exerciseIdByName('Plank'), sets: 3, reps: 30 }]),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST', message: 'Past plans cannot be edited' });
    });
  });

  describe('history does not rewrite', () => {
    it('shows a past plan as it was while equipment going down only affects today and later', async () => {
      const member = await createMember();
      const rowing = 'Rowing Machine Sprint';
      const past = await createPlanWithExercises(member.id, '2020-01-01', [rowing]);
      const today = await createPlanWithExercises(member.id, todayLocal(), [rowing]);

      const pastView = await getPlanForDate(member.id, '2020-01-01');
      const todayView = await getPlanForDate(member.id, todayLocal());

      expect(pastView?.id).toBe(past.id);
      expect(pastView?.exercises[0]).toMatchObject({ isPerformable: true, equipmentDown: [] });
      expect(Object.keys(pastView!.muscleLoad).length).toBeGreaterThan(0);
      expect(pastView?.needsReview).toBe(false);
      expect(todayView?.id).toBe(today.id);
      expect(todayView?.exercises[0]?.isPerformable).toBe(false);
      expect(todayView?.exercises[0]?.equipmentDown.length).toBeGreaterThan(0);
      expect(todayView?.muscleLoad).toEqual({});
    });

    it('can fetch a future plan', async () => {
      const member = await createMember();
      const tomorrow = dateOffset(todayLocal(), 1);
      await createPlanWithExercises(member.id, tomorrow, ['Push-Up', 'Plank']);

      const view = await getPlanForDate(member.id, tomorrow);

      expect(view?.planDate).toBe(tomorrow);
      expect(view?.exercises).toHaveLength(2);
    });

    it('lists the days in a range with their exercise and done counts', async () => {
      const member = await createMember();
      const other = await createMember('days-other@example.com');
      const yesterday = dateOffset(todayLocal(), -1);
      const tomorrow = dateOffset(todayLocal(), 1);
      const outside = dateOffset(todayLocal(), 9);
      const past = await createPlanWithExercises(member.id, yesterday, ['Push-Up', 'Plank', 'Pull-Up']);
      await db
        .update(fTrainingPlanExercises)
        .set({ completed: true })
        .where(and(eq(fTrainingPlanExercises.trainingPlanId, past.id), eq(fTrainingPlanExercises.orderIndex, 0)));
      await createPlanWithExercises(member.id, tomorrow, ['Push-Up', 'Plank']);
      await createPlanWithExercises(member.id, outside, ['Push-Up']);
      await createPlanWithExercises(other.id, tomorrow, ['Push-Up']);

      const days = await listPlanDays(member.id, yesterday, dateOffset(todayLocal(), 6));

      expect(days).toEqual([
        { planDate: yesterday, status: 'ai_published', exerciseCount: 3, completedCount: 1 },
        { planDate: tomorrow, status: 'ai_published', exerciseCount: 2, completedCount: 0 },
      ]);
    });
  });

  describe('plan prompt context', () => {
    // Today, so the days before it read as done or not done rather than planned.
    const planDate = todayLocal();

    async function captureAiPrompt(userId: string) {
      const squatId = await exerciseIdByName('Barbell Back Squat');
      let prompt = '';
      const evaluatePlan: EvaluatePlan = async (contextPrompt) => {
        prompt = contextPrompt;
        return { ok: true, data: { exercises: [{ exerciseId: squatId, sets: 3, reps: 5 }] } };
      };
      expectOk(await generateForDate(userId, planDate, false, { generator: 'ai', evaluatePlan }));
      return prompt;
    }

    it('skips resolved facts and keeps unresolved ones', async () => {
      const member = await createMember();
      await db.insert(fProfileEvents).values([
        {
          userId: member.id,
          eventType: 'injury',
          payload: { description: 'old shoulder strain' },
          resolvedAt: new Date(),
        },
        { userId: member.id, eventType: 'injury', payload: { description: 'sore left knee' } },
      ]);

      const prompt = await captureAiPrompt(member.id);

      expect(prompt).toContain('sore left knee');
      expect(prompt).not.toContain('old shoulder strain');
    });

    it('carries the physical information and the typed findings of each exam, never an attachment', async () => {
      const member = await createMember();
      await db.insert(fOnboardingSubmissions).values({
        userId: member.id,
        heightCm: 178,
        weightKg: 82.5,
        medications: ['Metoprolol'],
        physicalConditions: { conditions: [] },
        goals: 'Build endurance',
        exams: [
          {
            name: 'Resting ECG',
            date: '2026-07-01',
            findings: 'Mild bradycardia, no arrhythmia.',
            attachmentPath: `${member.id}/exam/00000000-0000-0000-0000-000000000000.pdf`,
          },
          { name: 'Blood test', findings: 'Normal.' },
        ],
      });
      const noExams = await createMember('no-exams@example.com');
      await db.insert(fOnboardingSubmissions).values({
        userId: noExams.id,
        heightCm: 160,
        weightKg: 55,
        medications: [],
        physicalConditions: { conditions: [] },
        goals: 'Tone up',
        exams: [],
      });

      const prompt = await captureAiPrompt(member.id);
      const promptWithoutExams = await captureAiPrompt(noExams.id);

      expect(prompt).toContain('Height: 178 cm, weight: 82.5 kg');
      expect(prompt).toContain('Medical exams:');
      expect(prompt).toContain('Resting ECG (2026-07-01): Mild bradycardia, no arrhythmia.');
      expect(prompt).toContain('Blood test: Normal.');
      expect(prompt).not.toContain('00000000-0000-0000-0000-000000000000.pdf');
      expect(promptWithoutExams).toContain('Height: 160 cm, weight: 55 kg');
      expect(promptWithoutExams).toContain('Medical exams: none');
    });

    it('carries the recent plans with done and not done, the check-in dates, trainer notes and demand', async () => {
      const member = await createMember();
      const other = await createMember('demand-other@example.com');
      const [trainer] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_TRAINER_EMAIL));
      const doneDate = dateOffset(planDate, -2);
      const missedDate = dateOffset(planDate, -4);
      const outsideWindow = dateOffset(planDate, -20);

      const donePlan = await createPlanWithExercises(member.id, doneDate, ['Barbell Back Squat']);
      await db
        .update(fTrainingPlanExercises)
        .set({ completed: true, load: 60 })
        .where(eq(fTrainingPlanExercises.trainingPlanId, donePlan.id));
      await createPlanWithExercises(member.id, missedDate, ['Push-Up']);
      await createPlanWithExercises(member.id, outsideWindow, ['Pull-Up']);
      await db.insert(fCheckIns).values({
        userId: member.id,
        checkedInAt: new Date(`${doneDate}T10:00:00`),
        turnstileStatus: 'success',
        turnstileResponse: {},
      });
      await db.insert(fPlanReviews).values({
        trainingPlanId: donePlan.id,
        userId: trainer!.id,
        note: 'Keep squats shallow for now',
        isEdit: false,
      });
      await createPlanWithExercises(member.id, planDate, ['Plank']);
      await createPlanWithExercises(other.id, planDate, ['Barbell Back Squat', 'Push-Up']);

      const prompt = await captureAiPrompt(member.id);

      expect(prompt).toContain(`- ${doneDate}: Barbell Back Squat 3x10 60 kg (done)`);
      expect(prompt).toContain(`- ${missedDate}: Push-Up 3x10 (not done)`);
      expect(prompt).not.toContain('Pull-Up 3x10');
      expect(prompt).toContain(`Gym check-in dates in the same period: ${doneDate}`);
      expect(prompt).toContain('note by');
      expect(prompt).toContain(`on the plan for ${doneDate}: Keep squats shallow for now`);
      expect(prompt).toContain(`Other members' plans for ${planDate}`);
      expect(prompt).toMatch(/counted in plans, not exercises\): 1\n/);
      expect(prompt).toContain('Equipment in demand (plans that use each piece):');
    });
  });

  describe('computePlanDemand', () => {
    const squat = {
      id: 'squat',
      muscles: [{ muscle: 'quads', role: 'primary' }],
      equipment: [{ id: 'rack', name: 'Squat Rack', isAvailable: true }],
    } as const;
    const press = {
      id: 'press',
      muscles: [{ muscle: 'quads', role: 'primary' }],
      equipment: [
        { id: 'rack', name: 'Squat Rack', isAvailable: true },
        { id: 'sled', name: 'Press Sled', isAvailable: false },
      ],
    } as const;
    const catalog = [squat, press];

    it('counts plans that use a piece, not the exercise rows that use it', () => {
      const demand = computePlanDemand(
        [
          { trainingPlanId: 'plan-a', exerciseId: 'squat', sets: 3 },
          { trainingPlanId: 'plan-a', exerciseId: 'press', sets: 3 },
          { trainingPlanId: 'plan-b', exerciseId: 'squat', sets: 4 },
        ],
        catalog,
      );

      expect(demand.otherPlanCount).toBe(2);
      expect(demand.equipment).toEqual([{ id: 'rack', name: 'Squat Rack', planCount: 2 }]);
      expect(demand.muscleLoad).toEqual({ quads: 10 });
    });

    it('is empty when no other member has a plan', () => {
      const demand = computePlanDemand([], catalog);

      expect(demand).toEqual({ otherPlanCount: 0, equipment: [], muscleLoad: {} });
      expect(buildDemandLines(demand, '2026-10-10').join('\n')).toContain('no other member plans for this date yet');
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
