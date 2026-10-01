import { db, pool } from '@api/db/client';
import { dUsers, fPlanReviews, fTrainingPlans, fUserPolicyOnUser } from '@api/db/schema';
import { SEED_ADMIN_EMAIL, SEED_TRAINER_EMAIL, seedBase } from '@api/db/seed';
import { logger } from '@api/lib/logger';
import { signSessionToken } from '@api/modules/auth/session';
import { generateForDate } from '@api/modules/plans/service';
import { resetTestDatabase } from '@api/test/database';
import { appRouter } from '@api/trpc/app-router';
import { createContext } from '@api/trpc/context';
import { createCallerFactory } from '@api/trpc/procedures';
import { MEMBER_POLICY_IDS, TRAINER_POLICY_IDS } from '@cadence/shared/auth';
import { eq } from 'drizzle-orm';
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

async function createMemberWithPlan() {
  const member = await createMember();
  const result = await generateForDate(member.id, '2026-10-01', false, { generator: 'placeholder' });
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
    it('flips the plan to trainer_edited and records an edit review entry', async () => {
      const { plan } = await createMemberWithPlan();
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
      const { plan } = await createMemberWithPlan();
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
      const { member, plan } = await createMemberWithPlan();
      const trainerId = await seededId(SEED_TRAINER_EMAIL);
      const trainerCaller = await callerFor(signSessionToken(trainerId));
      const catalog = (await trainerCaller.reviews.getPlan({ planId: plan.id })).catalog;
      const availableExercise = catalog.find((e) => e.isAvailable)!;
      await trainerCaller.reviews.editPlan({
        planId: plan.id,
        exercises: [{ exerciseId: availableExercise.id, sets: 4, reps: 8 }],
      });

      const blocked = await generateForDate(member.id, '2026-10-01', false, { generator: 'placeholder' });
      expect(blocked).toMatchObject({ status: 'needs_confirmation' });

      const confirmed = await generateForDate(member.id, '2026-10-01', true, { generator: 'placeholder' });
      expect(confirmed.status).toBe('ok');

      const reviews = await db.select().from(fPlanReviews).where(eq(fPlanReviews.trainingPlanId, plan.id));
      expect(reviews).toHaveLength(1);
    });
  });
});
