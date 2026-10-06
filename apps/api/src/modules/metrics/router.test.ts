import { db, pool } from '@api/db/client';
import {
  dExercises,
  dUsers,
  fCheckIns,
  fOnboardingSubmissions,
  fTrainingPlanExercises,
  fTrainingPlans,
  fUserPolicyGroupOnUser,
} from '@api/db/schema';
import { SEED_ADMIN_EMAIL, seedBase } from '@api/db/seed';
import { logger } from '@api/lib/logger';
import { signSessionToken } from '@api/modules/auth/session';
import { resetTestDatabase } from '@api/test/database';
import { appRouter } from '@api/trpc/app-router';
import { createContext } from '@api/trpc/context';
import { createCallerFactory } from '@api/trpc/procedures';
import { MEMBER_GROUP } from '@cadence/shared/auth';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const RANGE = { from: '2026-03-02', to: '2026-03-08' };

async function callerFor(token?: string) {
  const req = { cookies: token ? { cadence_session: token } : {}, log: logger };
  const res = { cookie: () => {}, clearCookie: () => {} };
  const ctx = await createContext({ req, res } as never);
  return createCallerFactory(appRouter)(ctx);
}

async function createMember(email: string) {
  const [member] = await db
    .insert(dUsers)
    .values({ email, name: email, membershipStatus: 'active', membershipPlan: 'Standard' })
    .returning();
  await db.insert(fUserPolicyGroupOnUser).values({ userId: member!.id, groupId: MEMBER_GROUP });
  return member!;
}

async function checkIn(userId: string, localDateTime: string) {
  await db.insert(fCheckIns).values({ userId, checkedInAt: new Date(localDateTime), turnstileStatus: 'success' });
}

async function addPlan(
  userId: string,
  planDate: string,
  exercises: { exerciseId: string; sets: number; reps: number; completed: boolean }[],
) {
  const [plan] = await db.insert(fTrainingPlans).values({ userId, planDate, status: 'ai_published' }).returning();
  await db
    .insert(fTrainingPlanExercises)
    .values(exercises.map((exercise, orderIndex) => ({ ...exercise, trainingPlanId: plan!.id, orderIndex })));
  return plan!;
}

// Two catalog exercises with different primary muscles: chest and lats.
async function pickExercises() {
  const [first] = await db.select().from(dExercises).where(eq(dExercises.name, 'Barbell Bench Press'));
  const [second] = await db.select().from(dExercises).where(eq(dExercises.name, 'Lat Pulldown'));
  return { first: first!, second: second! };
}

describe('metrics router', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });
  afterAll(() => pool.end());

  async function seedKnownDataSet() {
    const member = await createMember('metrics-member@example.com');
    const { first, second } = await pickExercises();

    // Three trained days: two check-ins on the 2nd count once, the 4th, and the very last minute of the range.
    // The check-in at midnight of the 9th is outside the range.
    for (const at of [
      '2026-03-02T08:00:00',
      '2026-03-02T18:00:00',
      '2026-03-04T10:00:00',
      '2026-03-08T23:59:00',
      '2026-03-09T00:00:00',
      '2026-02-28T10:00:00',
    ]) {
      await checkIn(member.id, at);
    }

    // The 3rd has completed exercises but no check-in, so it must not become a trained day.
    const firstDay = await addPlan(member.id, '2026-03-02', [
      { exerciseId: first.id, sets: 3, reps: 10, completed: true },
      { exerciseId: second.id, sets: 4, reps: 8, completed: false },
    ]);
    await addPlan(member.id, '2026-03-03', [
      { exerciseId: first.id, sets: 3, reps: 10, completed: true },
      { exerciseId: second.id, sets: 5, reps: 5, completed: true },
    ]);
    // Outside the range, so it contributes nothing.
    await addPlan(member.id, '2026-03-20', [{ exerciseId: first.id, sets: 9, reps: 9, completed: true }]);

    return { member, first, second, firstDay };
  }

  it('matches a hand-computed data set exactly', async () => {
    const { member, first, second } = await seedKnownDataSet();
    const submission = {
      userId: member.id,
      heightCm: 175,
      weightKg: 70,
      medications: [],
      physicalConditions: { conditions: [] },
      exams: [],
    };
    await db.insert(fOnboardingSubmissions).values([
      { ...submission, goals: 'Old goal', submittedAt: new Date('2026-01-01T10:00:00') },
      { ...submission, goals: 'Run a 10k', submittedAt: new Date('2026-02-01T10:00:00') },
    ]);
    const caller = await callerFor(signSessionToken(member.id));

    const metrics = await caller.metrics.mine(RANGE);

    expect(metrics.daysTrained).toBe(3);
    expect(metrics.trainingFrequency).toBe(3);
    expect(metrics.trainingVolume).toBe(3 * 10 + 3 * 10 + 5 * 5);
    expect(metrics.exerciseBreakdown.byExercise).toEqual([
      { name: first.name, completed: 2 },
      { name: second.name, completed: 1 },
    ]);
    // Completed work only: bench press 3 + 3 sets (chest primary, triceps and front delts secondary), lat
    // pulldown 5 sets (lats primary, biceps and rear delts secondary).
    expect(metrics.exerciseBreakdown.muscleLoad).toEqual({
      chest: 6,
      triceps: 3,
      'front-deltoid': 3,
      lats: 5,
      biceps: 2.5,
      'rear-deltoid': 2.5,
    });
    expect(metrics.goalProgress).toEqual({
      plannedExercises: 4,
      completedExercises: 3,
      completionRate: 0.75,
      goals: 'Run a 10k',
    });
  });

  it('does not count a day with completed exercises and no check-in as trained', async () => {
    const member = await createMember('no-checkin@example.com');
    const { first } = await pickExercises();
    await addPlan(member.id, '2026-03-03', [{ exerciseId: first.id, sets: 3, reps: 10, completed: true }]);
    const caller = await callerFor(signSessionToken(member.id));

    const metrics = await caller.metrics.mine(RANGE);

    expect(metrics.daysTrained).toBe(0);
    expect(metrics.trainingFrequency).toBe(0);
    expect(metrics.trainingVolume).toBe(30);
  });

  it('reflects a retroactive correction of a past plan', async () => {
    const { member, second, firstDay } = await seedKnownDataSet();
    const caller = await callerFor(signSessionToken(member.id));
    expect((await caller.metrics.mine(RANGE)).trainingVolume).toBe(85);

    await db
      .update(fTrainingPlanExercises)
      .set({ completed: true })
      .where(
        and(eq(fTrainingPlanExercises.trainingPlanId, firstDay.id), eq(fTrainingPlanExercises.exerciseId, second.id)),
      );

    const corrected = await caller.metrics.mine(RANGE);
    expect(corrected.trainingVolume).toBe(85 + 4 * 8);
    expect(corrected.goalProgress).toMatchObject({ completedExercises: 4, completionRate: 1 });
  });

  it('lists the days with a check-in and the latest check-in of a range, for the caller only', async () => {
    const member = await createMember('week-member@example.com');
    const other = await createMember('week-other@example.com');
    await checkIn(member.id, '2026-03-02T08:00:00');
    await checkIn(member.id, '2026-03-02T18:30:00');
    await checkIn(member.id, '2026-03-04T10:00:00');
    await checkIn(member.id, '2026-03-09T00:00:00');
    await checkIn(other.id, '2026-03-05T09:00:00');
    const caller = await callerFor(signSessionToken(member.id));

    const week = await caller.metrics.week(RANGE);

    expect(week.trainedDates).toEqual(['2026-03-02', '2026-03-04']);
    expect(week.lastCheckInAt).toEqual(new Date('2026-03-04T10:00:00'));
  });

  it('returns an empty week for a member who never checked in', async () => {
    const member = await createMember('week-empty@example.com');
    const caller = await callerFor(signSessionToken(member.id));

    expect(await caller.metrics.week(RANGE)).toEqual({ trainedDates: [], lastCheckInAt: null });
  });

  it('returns zeros and no goals for a member with no data', async () => {
    const member = await createMember('empty@example.com');
    const caller = await callerFor(signSessionToken(member.id));

    expect(await caller.metrics.mine(RANGE)).toEqual({
      ...RANGE,
      daysTrained: 0,
      trainingFrequency: 0,
      exerciseBreakdown: { byExercise: [], muscleLoad: {} },
      trainingVolume: 0,
      goalProgress: { plannedExercises: 0, completedExercises: 0, completionRate: 0, goals: null },
    });
  });

  it('only ever reads the caller’s own data', async () => {
    const { member } = await seedKnownDataSet();
    const other = await createMember('other-member@example.com');
    const caller = await callerFor(signSessionToken(other.id));

    const metrics = await caller.metrics.mine(RANGE);

    expect(member.id).not.toBe(other.id);
    expect(metrics.daysTrained).toBe(0);
    expect(metrics.trainingVolume).toBe(0);
  });

  it('rejects an inverted range, a signed-out caller and an account without the member policy', async () => {
    const member = await createMember('range@example.com');
    const asMember = await callerFor(signSessionToken(member.id));
    await expect(asMember.metrics.mine({ from: '2026-03-08', to: '2026-03-02' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });

    await expect((await callerFor()).metrics.mine(RANGE)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });

    const [admin] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_ADMIN_EMAIL));
    const asAdmin = await callerFor(signSessionToken(admin!.id));
    await expect(asAdmin.metrics.mine(RANGE)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
