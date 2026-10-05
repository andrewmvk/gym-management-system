import { db, pool } from '@api/db/client';
import { dUsers, fPlanChanges, fProfileEvents, fUserPolicyOnUser } from '@api/db/schema';
import { SEED_ADMIN_EMAIL, seedBase } from '@api/db/seed';
import { logger } from '@api/lib/logger';
import { signSessionToken } from '@api/modules/auth/session';
import { replacePlan } from '@api/modules/plans/repository';
import type { GenerateForDateResult, PlanStreamEvent } from '@api/modules/plans/service';
import { resetTestDatabase } from '@api/test/database';
import { appRouter } from '@api/trpc/app-router';
import { createContext } from '@api/trpc/context';
import { createCallerFactory } from '@api/trpc/procedures';
import { MEMBER_POLICY_IDS } from '@cadence/shared/auth';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

function expectOk(result: GenerateForDateResult) {
  if (result.status !== 'ok') throw new Error(`Expected status "ok", got "${result.status}"`);
  return result.plan;
}

async function createMember(email = 'plan-member@example.com') {
  const [user] = await db
    .insert(dUsers)
    .values({ email, name: 'Plan Router Member', passwordHash: await bcrypt.hash('password123', 4) })
    .returning();
  await db
    .insert(fUserPolicyOnUser)
    .values(MEMBER_POLICY_IDS.map((policyId) => ({ userId: user!.id, policyId, effect: 'granted' as const })));
  return user!;
}

async function callerFor(token?: string) {
  const req = { cookies: token ? { cadence_session: token } : {}, log: logger };
  const res = { cookie: () => {}, clearCookie: () => {} };
  const ctx = await createContext({ req, res } as never);
  return createCallerFactory(appRouter)(ctx);
}

type Caller = Awaited<ReturnType<typeof callerFor>>;

async function generateEvents(caller: Caller, input: { confirmOverwrite?: boolean } = {}) {
  const events: PlanStreamEvent[] = [];
  for await (const event of await caller.plans.generateToday(input)) events.push(event);
  return events;
}

async function generate(caller: Caller, input: { confirmOverwrite?: boolean } = {}) {
  const done = (await generateEvents(caller, input)).at(-1);
  if (done?.type !== 'done') throw new Error('The stream ended without a done event');
  return done.result;
}

describe('plans router', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });
  afterAll(() => pool.end());

  it('generates today’s plan for a signed-in member', async () => {
    const member = await createMember();
    const caller = await callerFor(signSessionToken(member.id));

    const result = await generate(caller);

    if (result.status !== 'ok') throw new Error(`Expected status "ok", got "${result.status}"`);
    expect(result.plan.userId).toBe(member.id);
    expect(result.plan.exercises.length).toBeGreaterThan(0);
  });

  it('streams each exercise before the saved plan', async () => {
    const member = await createMember();
    const caller = await callerFor(signSessionToken(member.id));

    const events = await generateEvents(caller);
    const exercises = events.filter((event) => event.type === 'exercise');
    const done = events.at(-1);

    expect(exercises.length).toBeGreaterThan(0);
    expect(events.slice(0, -1).every((event) => event.type === 'exercise')).toBe(true);
    if (done?.type !== 'done' || done.result.status !== 'ok') throw new Error('Expected an ok result');
    expect(exercises.map((event) => event.exercise.exerciseId)).toEqual(
      done.result.plan.exercises.map((exercise) => exercise.exerciseId),
    );
  });

  it('refuses a signed-out caller', async () => {
    const caller = await callerFor();

    await expect(generate(caller)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('refuses a staff account that has no update_own_plans grant', async () => {
    const [admin] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_ADMIN_EMAIL));
    const caller = await callerFor(signSessionToken(admin!.id));

    await expect(generate(caller)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  describe('getToday / getByDate / listDates', () => {
    it('returns null before any plan exists, then the plan with isPerformable exercises after generating', async () => {
      const member = await createMember();
      const caller = await callerFor(signSessionToken(member.id));

      expect(await caller.plans.getToday()).toBeNull();

      const generated = expectOk(await generate(caller));
      const today = await caller.plans.getToday();

      expect(today?.id).toBe(generated.id);
      expect(today?.exercises.length).toBeGreaterThan(0);
      expect(today?.exercises.every((e) => e.isPerformable)).toBe(true);
    });

    it('returns null from getByDate for a date with no plan', async () => {
      const member = await createMember();
      const caller = await callerFor(signSessionToken(member.id));

      expect(await caller.plans.getByDate({ date: '2020-01-01' })).toBeNull();
    });

    it('lists plan dates within range and never another member’s', async () => {
      const memberA = await createMember('plan-member-a@example.com');
      const memberB = await createMember('plan-member-b@example.com');
      const callerA = await callerFor(signSessionToken(memberA.id));
      const callerB = await callerFor(signSessionToken(memberB.id));
      const generated = expectOk(await generate(callerA));

      const datesA = await callerA.plans.listDates({ from: '2020-01-01', to: '2030-01-01' });
      const datesB = await callerB.plans.listDates({ from: '2020-01-01', to: '2030-01-01' });

      expect(datesA).toContain(generated.planDate);
      expect(datesB).toEqual([]);
    });

    it('never returns another member’s plan from getToday', async () => {
      const memberA = await createMember('plan-member-a@example.com');
      const memberB = await createMember('plan-member-b@example.com');
      await generate(await callerFor(signSessionToken(memberA.id)));

      const todayForB = await (await callerFor(signSessionToken(memberB.id))).plans.getToday();

      expect(todayForB).toBeNull();
    });
  });

  describe('markExerciseCompleted', () => {
    it('marks an exercise completed for its real owner', async () => {
      const member = await createMember();
      const caller = await callerFor(signSessionToken(member.id));
      const plan = expectOk(await generate(caller));
      const exerciseId = plan.exercises[0]!.id;

      const updated = await caller.plans.markExerciseCompleted({ planExerciseId: exerciseId, completed: true });

      expect(updated.completed).toBe(true);
    });

    it('refuses to mark an exercise belonging to another member', async () => {
      const memberA = await createMember('plan-member-a@example.com');
      const memberB = await createMember('plan-member-b@example.com');
      const planA = expectOk(await generate(await callerFor(signSessionToken(memberA.id))));
      const callerB = await callerFor(signSessionToken(memberB.id));

      await expect(
        callerB.plans.markExerciseCompleted({ planExerciseId: planA.exercises[0]!.id, completed: true }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('refuses an unknown planExerciseId', async () => {
      const member = await createMember();
      const caller = await callerFor(signSessionToken(member.id));

      await expect(
        caller.plans.markExerciseCompleted({ planExerciseId: '00000000-0000-0000-0000-000000000000', completed: true }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });

  describe('updateExercise', () => {
    it('saves the member’s own numbers and remembers them as a confirmed fact and a change entry', async () => {
      const member = await createMember();
      const caller = await callerFor(signSessionToken(member.id));
      const plan = expectOk(await generate(caller));
      const target = plan.exercises[0]!;

      const updated = await caller.plans.updateExercise({
        planExerciseId: target.id,
        sets: target.sets + 1,
        reps: 6,
        load: 22.5,
      });

      expect(updated).toMatchObject({ sets: target.sets + 1, reps: 6, load: 22.5 });
      const events = await db.select().from(fProfileEvents).where(eq(fProfileEvents.userId, member.id));
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ eventType: 'manual_plan_edit' });
      expect(events[0]?.confirmedAt).toBeInstanceOf(Date);
      expect(events[0]?.payload).toMatchObject({ description: expect.stringContaining('on their own') });
      const changes = await db.select().from(fPlanChanges).where(eq(fPlanChanges.trainingPlanId, plan.id));
      expect(changes).toHaveLength(1);
      expect(changes[0]).toMatchObject({ kind: 'member_edit', request: null });
    });

    it('records nothing when the numbers did not change', async () => {
      const member = await createMember();
      const caller = await callerFor(signSessionToken(member.id));
      const target = expectOk(await generate(caller)).exercises[0]!;

      await caller.plans.updateExercise({
        planExerciseId: target.id,
        sets: target.sets,
        reps: target.reps,
        load: target.load,
      });

      expect(await db.select().from(fProfileEvents).where(eq(fProfileEvents.userId, member.id))).toHaveLength(0);
    });

    it('refuses another member’s exercise and a past plan', async () => {
      const memberA = await createMember('plan-member-a@example.com');
      const memberB = await createMember('plan-member-b@example.com');
      const targetA = expectOk(await generate(await callerFor(signSessionToken(memberA.id)))).exercises[0]!;
      const callerB = await callerFor(signSessionToken(memberB.id));

      await expect(
        callerB.plans.updateExercise({ planExerciseId: targetA.id, sets: 2, reps: 5 }),
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });

      const past = await replacePlan({
        userId: memberB.id,
        planDate: '2020-01-01',
        exercises: [{ exerciseId: targetA.exerciseId, sets: 3, reps: 10 }],
      });
      await expect(
        callerB.plans.updateExercise({ planExerciseId: past.exercises[0]!.id, sets: 2, reps: 5 }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });
  });
});
