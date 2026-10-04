import { db, pool } from '@api/db/client';
import {
  dExercises,
  dGymEquipment,
  dUsers,
  fCheckIns,
  fOnboardingSubmissions,
  fPlanReviews,
  fProfileEvents,
  fTrainingPlanExercises,
  fTrainingPlans,
  fUserPolicyOnUser,
} from '@api/db/schema';
import { SEED_ADMIN_EMAIL, SEED_TRAINER_EMAIL, seedBase } from '@api/db/seed';
import { todayLocal } from '@api/lib/dates';
import { logger } from '@api/lib/logger';
import { signSessionToken } from '@api/modules/auth/session';
import { setFocus } from '@api/modules/focus/service';
import { generateForDate } from '@api/modules/plans/service';
import { resetTestDatabase } from '@api/test/database';
import { appRouter } from '@api/trpc/app-router';
import { createContext } from '@api/trpc/context';
import { createCallerFactory } from '@api/trpc/procedures';
import { MEMBER_POLICY_IDS, TRAINER_POLICY_IDS, UPDATE_ALL_PLANS } from '@cadence/shared/auth';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

async function callerFor(token?: string) {
  const req = { cookies: token ? { cadence_session: token } : {}, log: logger };
  const res = { cookie: () => {}, clearCookie: () => {} };
  const ctx = await createContext({ req, res } as never);
  return createCallerFactory(appRouter)(ctx);
}

async function createMember(email = 'review-member@example.com') {
  const [user] = await db.insert(dUsers).values({ email, name: 'Review Test Member' }).returning();
  await db
    .insert(fUserPolicyOnUser)
    .values(MEMBER_POLICY_IDS.map((policyId) => ({ userId: user!.id, policyId, effect: 'granted' as const })));
  return user!;
}

async function createTrainer(email: string) {
  const [user] = await db
    .insert(dUsers)
    .values({ email, name: `Trainer ${email}` })
    .returning();
  await db
    .insert(fUserPolicyOnUser)
    .values(TRAINER_POLICY_IDS.map((policyId) => ({ userId: user!.id, policyId, effect: 'granted' as const })));
  return user!;
}

async function seededId(email: string) {
  const [user] = await db.select().from(dUsers).where(eq(dUsers.email, email));
  return user!.id;
}

async function createMemberWithPlan(planDate = '2026-10-01') {
  const member = await createMember();
  const result = await generateForDate(member.id, planDate, false, { generator: 'placeholder' });
  if (result.status !== 'ok') throw new Error('setup: expected a generated plan');
  return { member, plan: result.plan };
}

describe('reviews router', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });
  afterAll(() => pool.end());

  describe('queue', () => {
    it('refuses a member', async () => {
      const member = await createMember();
      const caller = await callerFor(signSessionToken(member.id));

      await expect(caller.reviews.queue()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('lets the seeded trainer and admin both list it', async () => {
      const { plan } = await createMemberWithPlan();
      const trainerCaller = await callerFor(signSessionToken(await seededId(SEED_TRAINER_EMAIL)));
      const adminCaller = await callerFor(signSessionToken(await seededId(SEED_ADMIN_EMAIL)));

      const trainerQueue = await trainerCaller.reviews.queue();
      const adminQueue = await adminCaller.reviews.queue();

      expect(trainerQueue.find((entry) => entry.id === plan.id)).toMatchObject({ memberName: 'Review Test Member' });
      expect(adminQueue.find((entry) => entry.id === plan.id)).toBeDefined();
    });
  });

  describe('getPlan', () => {
    it('returns not_found for an unknown plan', async () => {
      const caller = await callerFor(signSessionToken(await seededId(SEED_TRAINER_EMAIL)));

      await expect(caller.reviews.getPlan({ planId: '00000000-0000-0000-0000-000000000000' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('returns the plan, its exercises, and its review history', async () => {
      const { plan } = await createMemberWithPlan();
      const caller = await callerFor(signSessionToken(await seededId(SEED_TRAINER_EMAIL)));

      const result = await caller.reviews.getPlan({ planId: plan.id });

      expect(result.plan.id).toBe(plan.id);
      expect(result.exercises.length).toBeGreaterThan(0);
      expect(result.reviews).toEqual([]);
      expect(result.catalog.length).toBeGreaterThan(0);
    });

    it('carries the completion tick of each exercise and notes any staff can read, with author and date', async () => {
      const { plan } = await createMemberWithPlan();
      await db
        .update(fTrainingPlanExercises)
        .set({ completed: true })
        .where(eq(fTrainingPlanExercises.trainingPlanId, plan.id));
      const trainerCaller = await callerFor(signSessionToken(await seededId(SEED_TRAINER_EMAIL)));
      await trainerCaller.reviews.addNote({ planId: plan.id, note: 'Watch the left knee.' });
      const adminCaller = await callerFor(signSessionToken(await seededId(SEED_ADMIN_EMAIL)));

      const result = await adminCaller.reviews.getPlan({ planId: plan.id });

      expect(result.exercises.every((exercise) => exercise.completed)).toBe(true);
      expect(result.reviews).toEqual([
        expect.objectContaining({
          note: 'Watch the left knee.',
          authorName: 'Demo Trainer',
          createdAt: expect.any(Date),
        }),
      ]);
    });

    it('adds the member context: who they are, onboarding with physical information and exams, and remembered facts', async () => {
      const { member, plan } = await createMemberWithPlan();
      await db.update(dUsers).set({ birthdate: '1990-01-15' }).where(eq(dUsers.id, member.id));
      await db.insert(fOnboardingSubmissions).values([
        {
          userId: member.id,
          heightCm: 170,
          weightKg: 80,
          medications: ['Old pill'],
          physicalConditions: { conditions: [] },
          goals: 'Old goal',
          exams: [],
          submittedAt: new Date('2026-08-01T10:00:00Z'),
        },
        {
          userId: member.id,
          heightCm: 171,
          weightKg: 76.5,
          medications: ['Ibuprofen'],
          physicalConditions: { conditions: ['Asthma'], otherNotes: 'Prefers mornings' },
          goals: 'Lose weight',
          exams: [{ name: 'Spirometry', date: '2026-07-01', findings: 'Mild reduction at rest.' }],
          submittedAt: new Date('2026-09-01T10:00:00Z'),
        },
      ]);
      await db.insert(fProfileEvents).values([
        {
          userId: member.id,
          eventType: 'injury',
          payload: { description: 'Sore left knee' },
          sourceMessage: 'my knee hurts',
          createdAt: new Date('2026-09-20T10:00:00Z'),
        },
        {
          userId: member.id,
          eventType: 'medication_change',
          payload: { description: 'Started a beta blocker' },
          sourceMessage: 'new medication',
          createdAt: new Date('2026-09-25T10:00:00Z'),
        },
        {
          userId: member.id,
          eventType: 'injury',
          payload: { description: 'Healed wrist' },
          createdAt: new Date('2026-09-10T10:00:00Z'),
          resolvedAt: new Date('2026-09-12T10:00:00Z'),
        },
        {
          userId: member.id,
          eventType: 'muscle_focus_changed',
          payload: { description: 'Muscle focus for Chest changed' },
        },
      ]);
      const caller = await callerFor(signSessionToken(await seededId(SEED_TRAINER_EMAIL)));

      const { memberContext } = await caller.reviews.getPlan({ planId: plan.id });

      expect(memberContext).toMatchObject({
        name: 'Review Test Member',
        age: expect.any(Number),
        onboarding: {
          heightCm: 171,
          weightKg: 76.5,
          goals: 'Lose weight',
          medications: ['Ibuprofen'],
          conditions: ['Asthma'],
          otherNotes: 'Prefers mornings',
          exams: [
            { name: 'Spirometry', date: '2026-07-01', findings: 'Mild reduction at rest.', hasAttachment: false },
          ],
        },
      });
      expect(memberContext).not.toHaveProperty('aptitude');
      expect(memberContext?.facts.map((fact) => [fact.eventType, fact.description, fact.sourceMessage])).toEqual([
        ['medication_change', 'Started a beta blocker', 'new medication'],
        ['injury', 'Sore left knee', 'my knee hurts'],
      ]);
      expect(memberContext?.facts[0]?.createdAt).toBeInstanceOf(Date);
      expect(JSON.stringify(memberContext)).not.toMatch(/embedding|photo/i);
    });

    it('adds the muscle work the member completed in the 14 days before the plan, and their focus', async () => {
      const { member, plan } = await createMemberWithPlan();
      const [bench] = await db.select().from(dExercises).where(eq(dExercises.name, 'Barbell Bench Press'));
      const addPlan = async (planDate: string, completed: boolean) => {
        const [row] = await db
          .insert(fTrainingPlans)
          .values({ userId: member.id, planDate, status: 'ai_published' })
          .returning();
        await db
          .insert(fTrainingPlanExercises)
          .values({ trainingPlanId: row!.id, exerciseId: bench!.id, sets: 3, reps: 10, orderIndex: 0, completed });
      };
      await addPlan('2026-09-28', true);
      await addPlan('2026-09-29', false);
      await addPlan('2026-09-10', true);
      await setFocus(member.id, { muscle: 'glutes', bias: 2 });
      const caller = await callerFor(signSessionToken(await seededId(SEED_TRAINER_EMAIL)));

      const result = await caller.reviews.getPlan({ planId: plan.id });

      expect(result.recentMuscleLoad).toEqual({ chest: 3, triceps: 1.5, 'front-deltoid': 1.5 });
      expect(result.muscleFocus).toEqual([{ muscle: 'glutes', bias: 2 }]);
    });
  });

  describe('must-review plans', () => {
    async function addPlanWith(memberId: string, planDate: string, exerciseName: string) {
      const [exercise] = await db.select().from(dExercises).where(eq(dExercises.name, exerciseName));
      const [plan] = await db
        .insert(fTrainingPlans)
        .values({ userId: memberId, planDate, status: 'ai_published' })
        .returning();
      await db
        .insert(fTrainingPlanExercises)
        .values({ trainingPlanId: plan!.id, exerciseId: exercise!.id, sets: 3, reps: 10, orderIndex: 0 });
      return plan!;
    }
    const setPullUpBar = (isAvailable: boolean) =>
      db.update(dGymEquipment).set({ isAvailable }).where(eq(dGymEquipment.name, 'Pull-up Bar'));

    it('flags a plan from today on that holds an exercise that cannot be done, and clears when it can', async () => {
      const member = await createMember('broken-queue@example.com');
      const today = await addPlanWith(member.id, todayLocal(), 'Pull-Up');
      const past = await addPlanWith(member.id, '2020-01-01', 'Pull-Up');
      await setPullUpBar(false);
      const caller = await callerFor(signSessionToken(await seededId(SEED_TRAINER_EMAIL)));

      const queue = await caller.reviews.queue();

      expect(queue.find((entry) => entry.id === today.id)).toMatchObject({ needsReview: true, unavailableCount: 1 });
      expect(queue.find((entry) => entry.id === past.id)).toMatchObject({ needsReview: false, unavailableCount: 0 });

      await setPullUpBar(true);
      expect((await caller.reviews.queue()).find((entry) => entry.id === today.id)?.needsReview).toBe(false);
    });

    it('shows the member the same flag and which equipment is down', async () => {
      const member = await createMember('broken-member@example.com');
      await addPlanWith(member.id, todayLocal(), 'Pull-Up');
      await setPullUpBar(false);
      const caller = await callerFor(signSessionToken(member.id));

      const plan = await caller.plans.getToday();

      expect(plan?.needsReview).toBe(true);
      expect(plan?.exercises[0]).toMatchObject({ isPerformable: false, equipmentDown: ['Pull-up Bar'] });
    });

    it('lists them first on the overview, with the pool map counting only what can be done', async () => {
      const broken = await createMember('broken-overview@example.com');
      const fine = await createMember('fine-overview@example.com');
      const brokenPlan = await addPlanWith(broken.id, todayLocal(), 'Pull-Up');
      await addPlanWith(fine.id, todayLocal(), 'Push-Up');
      await setPullUpBar(false);
      const caller = await callerFor(signSessionToken(await seededId(SEED_TRAINER_EMAIL)));

      const overview = await caller.reviews.overview();

      expect(overview.needsReview).toEqual([
        expect.objectContaining({
          planId: brokenPlan.id,
          memberName: 'Review Test Member',
          blocked: [expect.objectContaining({ name: 'Pull-Up', equipmentDown: ['Pull-up Bar'] })],
        }),
      ]);
      expect(overview.planCount).toBe(2);
      expect(overview.musclePlans.chest).toBe(1);
      expect(overview.musclePlans.lats).toBeUndefined();
      // Out-of-service pieces come first, and each piece counts today's plans that use it.
      expect(overview.equipment[0]).toMatchObject({ name: 'Pull-up Bar', isAvailable: false, planCount: 1 });
      expect(overview.equipment.filter((piece) => !piece.isAvailable).length).toBeGreaterThanOrEqual(1);
      const unusedPiece = overview.equipment.find((piece) => piece.name === 'Treadmill');
      expect(unusedPiece).toMatchObject({ isAvailable: true, planCount: 0 });
    });

    it('counts plans, muscles and equipment twice: for everyone and for members already checked in', async () => {
      const inGym = await createMember('in-gym@example.com');
      const notYet = await createMember('not-yet@example.com');
      const bodyweight = await createMember('bodyweight-overview@example.com');
      await addPlanWith(inGym.id, todayLocal(), 'Pull-Up');
      await addPlanWith(notYet.id, todayLocal(), 'Pull-Up');
      await addPlanWith(bodyweight.id, todayLocal(), 'Push-Up');
      // A member who scans twice is still one member, and a check-in of another day does not count.
      await db.insert(fCheckIns).values([
        { userId: inGym.id, turnstileStatus: 'success' },
        { userId: inGym.id, turnstileStatus: 'failed' },
        { userId: bodyweight.id, turnstileStatus: 'success', checkedInAt: new Date('2020-01-01T10:00:00') },
      ]);
      const caller = await callerFor(signSessionToken(await seededId(SEED_TRAINER_EMAIL)));

      const overview = await caller.reviews.overview();

      expect(overview).toMatchObject({ planCount: 3, checkedInPlanCount: 1 });
      expect(overview.musclePlans.lats).toBe(2);
      expect(overview.muscleCheckedIn.lats).toBe(1);
      expect(overview.musclePlans.chest).toBe(1);
      expect(overview.muscleCheckedIn.chest).toBeUndefined();
      expect(overview.equipment.find((piece) => piece.name === 'Pull-up Bar')).toMatchObject({
        isAvailable: true,
        planCount: 2,
        checkedInCount: 1,
      });
    });

    it('does not charge a broken piece for an exercise that still has a working alternative', async () => {
      const member = await createMember('alternative-overview@example.com');
      await addPlanWith(member.id, todayLocal(), 'Barbell Bench Press');
      await db.update(dGymEquipment).set({ isAvailable: false }).where(eq(dGymEquipment.name, 'Bench'));
      const caller = await callerFor(signSessionToken(await seededId(SEED_TRAINER_EMAIL)));

      const overview = await caller.reviews.overview();

      expect(overview.needsReview).toEqual([]);
      expect(overview.musclePlans.chest).toBe(1);
      expect(overview.equipment.find((piece) => piece.name === 'Barbell')).toMatchObject({ planCount: 1 });
      expect(overview.equipment.find((piece) => piece.name === 'Bench')).toMatchObject({
        isAvailable: false,
        planCount: 0,
        checkedInCount: 0,
      });
    });

    it('counts trainer activity over the last 7 days only', async () => {
      const recent = await createMember('recent-activity@example.com');
      const stale = await createMember('stale-activity@example.com');
      const recentPlan = await addPlanWith(recent.id, todayLocal(), 'Push-Up');
      const stalePlan = await addPlanWith(stale.id, todayLocal(), 'Push-Up');
      const trainer = await createTrainer('activity-trainer@example.com');
      await db.insert(fPlanReviews).values([
        { trainingPlanId: recentPlan.id, userId: trainer.id, note: 'Recent note', isEdit: false },
        {
          trainingPlanId: stalePlan.id,
          userId: trainer.id,
          note: 'Old note',
          isEdit: false,
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        },
      ]);
      const caller = await callerFor(signSessionToken(trainer.id));

      const { trainerActivity } = await caller.reviews.overview();

      expect(trainerActivity).toMatchObject({ planCount: 1, windowDays: 7 });
      expect(trainerActivity.latest).toMatchObject({ trainingPlanId: recentPlan.id });
    });

    it('counts plans a trainer edited or noted, and keeps notes apart from edits in the queue', async () => {
      const edited = await createMember('edited-member@example.com');
      const noted = await createMember('noted-member@example.com');
      const untouched = await createMember('untouched-member@example.com');
      const editedPlan = await addPlanWith(edited.id, todayLocal(), 'Push-Up');
      const notedPlan = await addPlanWith(noted.id, todayLocal(), 'Push-Up');
      const untouchedPlan = await addPlanWith(untouched.id, todayLocal(), 'Push-Up');
      const trainer = await createTrainer('overview-trainer@example.com');
      const caller = await callerFor(signSessionToken(trainer.id));
      await caller.reviews.editPlan({
        planId: editedPlan.id,
        exercises: [{ exerciseId: (await db.select().from(dExercises))[0]!.id, sets: 3, reps: 10 }],
      });
      await caller.reviews.addNote({ planId: notedPlan.id, note: 'Add a pulling exercise' });

      const queue = await caller.reviews.queue();
      const overview = await caller.reviews.overview();

      expect(queue.find((entry) => entry.id === editedPlan.id)).toMatchObject({
        status: 'trainer_edited',
        noteCount: 0,
      });
      expect(queue.find((entry) => entry.id === notedPlan.id)).toMatchObject({ status: 'ai_published', noteCount: 1 });
      expect(queue.find((entry) => entry.id === untouchedPlan.id)).toMatchObject({ noteCount: 0 });
      expect(overview.trainerActivity.planCount).toBe(2);
      expect(overview.trainerActivity.latest).toMatchObject({ trainingPlanId: notedPlan.id, isEdit: false });
    });

    it('refuses a member the overview', async () => {
      const member = await createMember('overview-member@example.com');
      const caller = await callerFor(signSessionToken(member.id));

      await expect(caller.reviews.overview()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });
  });

  describe('addNote', () => {
    it('refuses a member and an admin (only a trainer may review)', async () => {
      const { member, plan } = await createMemberWithPlan();
      const memberCaller = await callerFor(signSessionToken(member.id));
      const adminCaller = await callerFor(signSessionToken(await seededId(SEED_ADMIN_EMAIL)));

      await expect(memberCaller.reviews.addNote({ planId: plan.id, note: 'hi' })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
      await expect(adminCaller.reviews.addNote({ planId: plan.id, note: 'hi' })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    });

    it('keeps notes from two different trainers, in order', async () => {
      const { plan } = await createMemberWithPlan();
      await createTrainer('trainer-two@example.com');
      const trainerOne = await callerFor(signSessionToken(await seededId(SEED_TRAINER_EMAIL)));
      const trainerTwo = await callerFor(signSessionToken(await seededId('trainer-two@example.com')));

      await trainerOne.reviews.addNote({ planId: plan.id, note: 'Looks good overall.' });
      await trainerTwo.reviews.addNote({ planId: plan.id, note: 'Increase load next week.' });

      const reviews = await db
        .select()
        .from(fPlanReviews)
        .where(eq(fPlanReviews.trainingPlanId, plan.id))
        .orderBy(fPlanReviews.createdAt);
      expect(reviews.map((r) => r.note)).toEqual(['Looks good overall.', 'Increase load next week.']);
    });
  });

  describe('editPlan', () => {
    it('refuses to edit a plan dated before today', async () => {
      const { plan } = await createMemberWithPlan('2020-01-01');
      const caller = await callerFor(signSessionToken(await seededId(SEED_TRAINER_EMAIL)));
      const availableExercise = (await caller.reviews.getPlan({ planId: plan.id })).catalog.find((e) => e.isAvailable)!;

      await expect(
        caller.reviews.editPlan({
          planId: plan.id,
          exercises: [{ exerciseId: availableExercise.id, sets: 3, reps: 10 }],
        }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST', message: 'Past plans cannot be edited' });
    });

    it('needs update TrainingPlan as well as manage PlanReview, while a note needs only the review policy', async () => {
      const { plan } = await createMemberWithPlan(todayLocal());
      const reviewer = await createTrainer('review-only@example.com');
      await db
        .delete(fUserPolicyOnUser)
        .where(and(eq(fUserPolicyOnUser.userId, reviewer.id), eq(fUserPolicyOnUser.policyId, UPDATE_ALL_PLANS)));
      const caller = await callerFor(signSessionToken(reviewer.id));
      const exerciseId = (await db.select().from(dExercises))[0]!.id;

      await expect(
        caller.reviews.editPlan({ planId: plan.id, exercises: [{ exerciseId, sets: 3, reps: 10 }] }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(caller.reviews.addNote({ planId: plan.id, note: 'Only a note' })).resolves.toMatchObject({
        note: 'Only a note',
      });
    });

    it('flips the plan to trainer_edited and records an edit review entry', async () => {
      const { plan } = await createMemberWithPlan(todayLocal());
      const trainerId = await seededId(SEED_TRAINER_EMAIL);
      const caller = await callerFor(signSessionToken(trainerId));
      const catalog = (await caller.reviews.getPlan({ planId: plan.id })).catalog;
      const availableExercise = catalog.find((e) => e.isAvailable)!;

      await caller.reviews.editPlan({
        planId: plan.id,
        exercises: [{ exerciseId: availableExercise.id, sets: 4, reps: 8 }],
        note: 'Swapped for a safer alternative.',
      });

      const [updatedPlan] = await db.select().from(fTrainingPlans).where(eq(fTrainingPlans.id, plan.id));
      expect(updatedPlan?.status).toBe('trainer_edited');
      expect(updatedPlan?.lastEditedByUserId).toBe(trainerId);

      const reviews = await db.select().from(fPlanReviews).where(eq(fPlanReviews.trainingPlanId, plan.id));
      expect(reviews).toHaveLength(1);
      expect(reviews[0]).toMatchObject({ isEdit: true, note: 'Swapped for a safer alternative.' });
    });

    it('uses a default note when none is given', async () => {
      const { plan } = await createMemberWithPlan(todayLocal());
      const caller = await callerFor(signSessionToken(await seededId(SEED_TRAINER_EMAIL)));
      const catalog = (await caller.reviews.getPlan({ planId: plan.id })).catalog;
      const availableExercise = catalog.find((e) => e.isAvailable)!;

      await caller.reviews.editPlan({
        planId: plan.id,
        exercises: [{ exerciseId: availableExercise.id, sets: 3, reps: 12 }],
      });

      const [review] = await db.select().from(fPlanReviews).where(eq(fPlanReviews.trainingPlanId, plan.id));
      expect(review?.note).toBeTruthy();
    });
  });

  describe('regeneration guard integration (RN-06 / FR-22)', () => {
    it('blocks regeneration with the trainer’s name and lets it through once confirmed', async () => {
      const { member, plan } = await createMemberWithPlan(todayLocal());
      const trainerId = await seededId(SEED_TRAINER_EMAIL);
      const trainerCaller = await callerFor(signSessionToken(trainerId));
      const catalog = (await trainerCaller.reviews.getPlan({ planId: plan.id })).catalog;
      const availableExercise = catalog.find((e) => e.isAvailable)!;
      await trainerCaller.reviews.editPlan({
        planId: plan.id,
        exercises: [{ exerciseId: availableExercise.id, sets: 4, reps: 8 }],
      });

      const blocked = await generateForDate(member.id, todayLocal(), false, { generator: 'placeholder' });
      expect(blocked).toMatchObject({ status: 'needs_confirmation' });

      const confirmed = await generateForDate(member.id, todayLocal(), true, { generator: 'placeholder' });
      expect(confirmed.status).toBe('ok');

      const reviews = await db.select().from(fPlanReviews).where(eq(fPlanReviews.trainingPlanId, plan.id));
      expect(reviews).toHaveLength(1);
    });
  });
});
