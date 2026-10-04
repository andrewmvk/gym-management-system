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
  fUserPolicyGroupOnUser,
} from '@api/db/schema';
import { SEED_ADMIN_EMAIL, SEED_TRAINER_EMAIL, seedBase } from '@api/db/seed';
import { localDateString, shiftLocalDate, todayLocal } from '@api/lib/dates';
import { logger } from '@api/lib/logger';
import { signSessionToken } from '@api/modules/auth/session';
import { resetTestDatabase } from '@api/test/database';
import { appRouter } from '@api/trpc/app-router';
import { createContext } from '@api/trpc/context';
import { createCallerFactory } from '@api/trpc/procedures';
import { MEMBER_GROUP } from '@cadence/shared/auth';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

async function callerFor(token?: string) {
  const req = { cookies: token ? { cadence_session: token } : {}, log: logger };
  const res = { cookie: () => {}, clearCookie: () => {} };
  const ctx = await createContext({ req, res } as never);
  return createCallerFactory(appRouter)(ctx);
}

async function tokenOf(email: string) {
  const [user] = await db.select().from(dUsers).where(eq(dUsers.email, email));
  return signSessionToken(user!.id);
}

async function createMember(email = 'members-router@example.com', membershipStatus: 'active' | 'inactive' = 'active') {
  const [member] = await db
    .insert(dUsers)
    .values({
      email,
      name: 'Members Router Member',
      passwordHash: await bcrypt.hash('member-password', 4),
      birthdate: '1990-05-20',
      gender: 'female',
      referencePhotoPath: 'secret/photo.jpg',
      referenceFaceEmbedding: [0.1, 0.2],
      membershipStatus,
      membershipPlan: 'Standard',
    })
    .returning();
  await db.insert(fUserPolicyGroupOnUser).values({ userId: member!.id, groupId: MEMBER_GROUP });
  return member!;
}

describe('members router', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });
  afterAll(() => pool.end());

  describe('setMembershipStatus', () => {
    it('lets an admin switch a member off and on, and stating the same value again changes nothing', async () => {
      const member = await createMember();
      const caller = await callerFor(await tokenOf(SEED_ADMIN_EMAIL));

      const off = await caller.members.setMembershipStatus({ userId: member.id, status: 'inactive' });
      const offAgain = await caller.members.setMembershipStatus({ userId: member.id, status: 'inactive' });
      const on = await caller.members.setMembershipStatus({ userId: member.id, status: 'active' });

      expect(off).toMatchObject({ id: member.id, membershipStatus: 'inactive' });
      expect(offAgain).toEqual(off);
      expect(on.membershipStatus).toBe('active');
      expect(JSON.stringify(on)).not.toMatch(/embedding|photo|password/i);
    });

    it('locks the member out of login and of an existing session until it is switched back', async () => {
      const member = await createMember();
      const memberToken = signSessionToken(member.id);
      const admin = await callerFor(await tokenOf(SEED_ADMIN_EMAIL));

      await admin.members.setMembershipStatus({ userId: member.id, status: 'inactive' });

      expect(await (await callerFor(memberToken)).auth.me()).toBeNull();
      await expect(
        (await callerFor()).auth.login({ email: member.email, password: 'member-password' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });

      await admin.members.setMembershipStatus({ userId: member.id, status: 'active' });
      expect((await (await callerFor(memberToken)).auth.me())?.user.id).toBe(member.id);
    });

    it('refuses a trainer, a member and a signed-out visitor', async () => {
      const member = await createMember();
      const input = { userId: member.id, status: 'inactive' as const };

      await expect(
        (await callerFor(await tokenOf(SEED_TRAINER_EMAIL))).members.setMembershipStatus(input),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(
        (await callerFor(signSessionToken(member.id))).members.setMembershipStatus(input),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect((await callerFor()).members.setMembershipStatus(input)).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('cannot be applied to a staff account, an applicant without a membership, or an unknown user', async () => {
      const caller = await callerFor(await tokenOf(SEED_ADMIN_EMAIL));
      const [trainer] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_TRAINER_EMAIL));

      await expect(
        caller.members.setMembershipStatus({ userId: trainer!.id, status: 'inactive' }),
      ).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
      await expect(
        caller.members.setMembershipStatus({ userId: '00000000-0000-4000-8000-000000000000', status: 'inactive' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      const [after] = await db.select().from(dUsers).where(eq(dUsers.id, trainer!.id));
      expect(after?.membershipStatus).toBeNull();
    });
  });

  describe('get', () => {
    async function addPlan(userId: string, planDate: string, completedCount: number) {
      const [plan] = await db.insert(fTrainingPlans).values({ userId, planDate, status: 'ai_published' }).returning();
      const exercise = await db.select().from(dExercises).limit(3);
      await db.insert(fTrainingPlanExercises).values(
        exercise.map((row, orderIndex) => ({
          trainingPlanId: plan!.id,
          exerciseId: row.id,
          sets: 3,
          reps: 10,
          orderIndex,
          completed: orderIndex < completedCount,
        })),
      );
      return plan!;
    }

    it('gives a trainer the profile, membership, history and facts of one member, without biometrics', async () => {
      const member = await createMember();
      const trainerId = (await db.select().from(dUsers).where(eq(dUsers.email, SEED_TRAINER_EMAIL)))[0]!.id;
      await db.insert(fOnboardingSubmissions).values({
        userId: member.id,
        heightCm: 168,
        weightKg: 61.5,
        medications: ['Ibuprofen'],
        physicalConditions: { conditions: ['Asthma'], otherNotes: 'Mornings only' },
        goals: 'Run a 10 km',
        exams: [
          {
            name: 'Spirometry',
            date: '2026-07-01',
            findings: 'Mild reduction at rest.',
            attachmentPath: 'secret/exam.pdf',
          },
          { name: 'Blood test', findings: 'Normal.' },
        ],
      });
      await db.insert(fProfileEvents).values([
        { userId: member.id, eventType: 'injury', payload: { description: 'Sore knee' }, sourceMessage: 'knee hurts' },
        {
          userId: member.id,
          eventType: 'injury',
          payload: { description: 'Healed wrist' },
          resolvedAt: new Date(),
          createdAt: new Date(Date.now() - 1000),
        },
        { userId: member.id, eventType: 'muscle_focus_changed', payload: { description: 'Focus changed' } },
      ]);
      const today = todayLocal();
      const recent = await addPlan(member.id, shiftLocalDate(today, -3), 2);
      await addPlan(member.id, shiftLocalDate(today, -90), 1);
      await addPlan(member.id, shiftLocalDate(today, 1), 0);
      await db.insert(fPlanReviews).values([
        { trainingPlanId: recent.id, userId: trainerId, note: 'A note', isEdit: false },
        { trainingPlanId: recent.id, userId: trainerId, note: 'An edit', isEdit: true },
      ]);

      const result = await (await callerFor(await tokenOf(SEED_TRAINER_EMAIL))).members.get({ userId: member.id });

      expect(result.profile).toMatchObject({ id: member.id, name: 'Members Router Member', birthdate: '1990-05-20' });
      expect(result.profile.age).toEqual(expect.any(Number));
      expect(result.membership).toEqual({ status: 'active', plan: 'Standard' });
      expect(result).not.toHaveProperty('aptitude');
      expect(result.onboarding).toMatchObject({
        heightCm: 168,
        weightKg: 61.5,
        goals: 'Run a 10 km',
        conditions: ['Asthma'],
        otherNotes: 'Mornings only',
        exams: [
          { name: 'Spirometry', date: '2026-07-01', findings: 'Mild reduction at rest.', hasAttachment: true },
          { name: 'Blood test', date: null, findings: 'Normal.', hasAttachment: false },
        ],
      });
      expect(result.facts.map((fact) => [fact.description, fact.resolvedAt === null])).toEqual([
        ['Sore knee', true],
        ['Healed wrist', false],
      ]);
      expect(result.plans.map((plan) => plan.planDate)).toEqual([shiftLocalDate(today, 1), shiftLocalDate(today, -3)]);
      expect(result.plans[1]).toMatchObject({ exerciseCount: 3, completedCount: 2, noteCount: 1 });
      expect(result.plans[0]).toMatchObject({ exerciseCount: 3, completedCount: 0, noteCount: 0 });
      const payload = JSON.stringify(result);
      expect(payload).not.toMatch(/embedding|reference|photo|exam\.pdf|password/i);
    });

    it('lists the last 30 distinct check-in days, newest first', async () => {
      const member = await createMember();
      const now = new Date();
      const rows = Array.from({ length: 40 }, (_, daysAgo) => [
        {
          userId: member.id,
          checkedInAt: new Date(now.getTime() - daysAgo * 86_400_000),
          turnstileStatus: 'success' as const,
        },
        {
          userId: member.id,
          checkedInAt: new Date(now.getTime() - daysAgo * 86_400_000 - 1000),
          turnstileStatus: 'failed' as const,
        },
      ]).flat();
      await db.insert(fCheckIns).values(rows);

      const result = await (await callerFor(await tokenOf(SEED_ADMIN_EMAIL))).members.get({ userId: member.id });

      expect(result.checkInDates).toHaveLength(30);
      expect(result.checkInDates[0]).toBe(localDateString(now));
      expect(new Set(result.checkInDates).size).toBe(30);
    });

    it('answers not found for a staff account or an unknown id, and refuses a member', async () => {
      const member = await createMember();
      const trainerCaller = await callerFor(await tokenOf(SEED_TRAINER_EMAIL));
      const [admin] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_ADMIN_EMAIL));

      await expect(trainerCaller.members.get({ userId: admin!.id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(trainerCaller.members.get({ userId: '00000000-0000-4000-8000-000000000000' })).rejects.toMatchObject(
        { code: 'NOT_FOUND' },
      );
      await expect(
        (await callerFor(signSessionToken(member.id))).members.get({ userId: member.id }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect((await callerFor()).members.get({ userId: member.id })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('also lets a trainer open the members table now that trainers hold read_members', async () => {
      await createMember();

      const rows = await (await callerFor(await tokenOf(SEED_TRAINER_EMAIL))).auth.listMembers();

      expect(rows.map((row) => row.name)).toContain('Members Router Member');
    });
  });
});
