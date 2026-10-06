import { db, pool } from '@api/db/client';
import { dExercises, dUsers, fTrainingPlanExercises, fTrainingPlans, fUserPolicyOnUser } from '@api/db/schema';
import { SEED_ADMIN_EMAIL, seedBase } from '@api/db/seed';
import { shiftLocalDate, todayLocal } from '@api/lib/dates';
import { logger } from '@api/lib/logger';
import { SESSION_COOKIE, signSessionToken } from '@api/modules/auth/session';
import { resetTestDatabase } from '@api/test/database';
import { appRouter } from '@api/trpc/app-router';
import { createContext } from '@api/trpc/context';
import { createCallerFactory } from '@api/trpc/procedures';
import { MEMBER_POLICY_IDS } from '@cadence/shared/auth';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const MEMBER_EMAIL = 'member@example.com';

async function callerFor(token?: string) {
  const req = { cookies: token ? { [SESSION_COOKIE]: token } : {}, log: logger };
  const res = { cookie: vi.fn(), clearCookie: vi.fn() };
  const ctx = await createContext({ req, res } as unknown as CreateExpressContextOptions);
  return createCallerFactory(appRouter)(ctx);
}

async function memberToken() {
  const [member] = await db
    .insert(dUsers)
    .values({ email: MEMBER_EMAIL, name: 'Demo Member', passwordHash: await bcrypt.hash('x', 4) })
    .returning();
  await db
    .insert(fUserPolicyOnUser)
    .values(MEMBER_POLICY_IDS.map((policyId) => ({ userId: member!.id, policyId, effect: 'granted' as const })));
  return signSessionToken(member!.id);
}

async function adminToken() {
  const [admin] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_ADMIN_EMAIL));
  return signSessionToken(admin!.id);
}

describe('catalog', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });
  afterAll(() => pool.end());

  it('refuses a signed-out visitor the catalog reads', async () => {
    const caller = await callerFor();

    await expect(caller.catalog.list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(caller.catalog.listEquipment()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(
      caller.catalog.equipmentImpact({ equipmentId: '00000000-0000-0000-0000-000000000000' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('lists the seeded exercises with computed availability to a member', async () => {
    const caller = await callerFor(await memberToken());

    const exercises = await caller.catalog.list();

    expect(exercises.length).toBeGreaterThanOrEqual(25);
    const bodyweight = exercises.find((exercise) => exercise.name === 'Bodyweight Squat');
    expect(bodyweight?.isAvailable).toBe(true);
    const rowing = exercises.find((exercise) => exercise.name === 'Rowing Machine Sprint');
    expect(rowing?.isAvailable).toBe(false);
  });

  it('lists the seeded equipment, including the two unavailable items', async () => {
    const caller = await callerFor(await memberToken());

    const equipment = await caller.catalog.listEquipment();

    expect(equipment.length).toBeGreaterThanOrEqual(12);
    expect(
      equipment
        .filter((item) => !item.isAvailable)
        .map((item) => item.name)
        .sort(),
    ).toEqual(['Rowing Machine', 'Stationary Bike']);
  });

  describe('a member without the catalog-management policy', () => {
    it('is forbidden from creating an exercise', async () => {
      const caller = await callerFor(await memberToken());

      await expect(
        caller.catalog.createExercise({
          name: 'Test Exercise',
          muscles: [{ muscle: 'quads', role: 'primary' }],
          instructions: 'Do it.',
          equipmentIds: [],
        }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('is forbidden from creating equipment', async () => {
      const caller = await callerFor(await memberToken());

      await expect(caller.catalog.createEquipment({ name: 'Test Equipment' })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    });

    it('is forbidden from changing equipment availability or links', async () => {
      const caller = await callerFor(await memberToken());
      const [equipment] = await caller.catalog.listEquipment();

      await expect(
        caller.catalog.setEquipmentAvailability({ id: equipment!.id, isAvailable: false }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(
        caller.catalog.setEquipmentLinks({ equipmentId: equipment!.id, exerciseIds: [] }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });
  });

  describe('an admin', () => {
    it('can create an exercise linked to equipment', async () => {
      const caller = await callerFor(await adminToken());
      const [barbell] = (await caller.catalog.listEquipment()).filter((item) => item.name === 'Barbell');

      const exercise = await caller.catalog.createExercise({
        name: 'Test Deadlift',
        muscles: [
          { muscle: 'lower-back', role: 'primary' },
          { muscle: 'glutes', role: 'primary' },
          { muscle: 'hamstrings', role: 'secondary' },
        ],
        instructions: 'Hinge and lift.',
        equipmentIds: [barbell!.id],
      });

      const [reloaded] = (await caller.catalog.list()).filter((item) => item.id === exercise.id);
      expect(reloaded?.equipment.map((item) => item.id)).toEqual([barbell!.id]);
      expect(reloaded?.muscles).toHaveLength(3);
    });

    it('refuses an exercise without a primary muscle', async () => {
      const caller = await callerFor(await adminToken());

      await expect(
        caller.catalog.createExercise({
          name: 'Test No Primary',
          muscles: [{ muscle: 'biceps', role: 'secondary' }],
          instructions: 'Do it.',
          equipmentIds: [],
        }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('can create a new piece of equipment', async () => {
      const caller = await callerFor(await adminToken());

      const equipment = await caller.catalog.createEquipment({ name: 'Battle Ropes' });

      expect(equipment.name).toBe('Battle Ropes');
      expect(equipment.isAvailable).toBe(true);
    });

    it('sets one piece of equipment to the stated value without affecting the others', async () => {
      const caller = await callerFor(await adminToken());
      const before = await caller.catalog.listEquipment();
      const treadmill = before.find((item) => item.name === 'Treadmill')!;

      const updated = await caller.catalog.setEquipmentAvailability({ id: treadmill.id, isAvailable: false });

      expect(updated.isAvailable).toBe(false);
      const after = await caller.catalog.listEquipment();
      for (const item of after) {
        if (item.id === treadmill.id) continue;
        expect(item.isAvailable).toBe(before.find((original) => original.id === item.id)!.isAvailable);
      }
    });

    it('is idempotent: stating the same value twice leaves it there, and an unknown id is not found', async () => {
      const caller = await callerFor(await adminToken());
      const treadmill = (await caller.catalog.listEquipment()).find((item) => item.name === 'Treadmill')!;

      await caller.catalog.setEquipmentAvailability({ id: treadmill.id, isAvailable: false });
      const again = await caller.catalog.setEquipmentAvailability({ id: treadmill.id, isAvailable: false });
      expect(again.isAvailable).toBe(false);

      const restored = await caller.catalog.setEquipmentAvailability({ id: treadmill.id, isAvailable: true });
      expect(restored.isAvailable).toBe(true);
      await expect(
        caller.catalog.setEquipmentAvailability({ id: '00000000-0000-0000-0000-000000000000', isAvailable: true }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    describe('equipment impact', () => {
      async function planWith(email: string, planDate: string, exerciseName: string) {
        const [member] = await db.insert(dUsers).values({ email, name: email }).returning();
        const [exercise] = await db.select().from(dExercises).where(eq(dExercises.name, exerciseName));
        const [plan] = await db
          .insert(fTrainingPlans)
          .values({ userId: member!.id, planDate, status: 'ai_published' })
          .returning();
        await db
          .insert(fTrainingPlanExercises)
          .values({ trainingPlanId: plan!.id, exerciseId: exercise!.id, sets: 3, reps: 10, orderIndex: 0 });
        return member!;
      }

      it('counts the plans from today on that would lose their only working equipment, and the members behind them', async () => {
        const caller = await callerFor(await adminToken());
        const bar = (await caller.catalog.listEquipment()).find((item) => item.name === 'Pull-up Bar')!;
        const today = todayLocal();
        const tomorrow = shiftLocalDate(today, 1);
        await planWith('impact-a@example.com', today, 'Pull-Up');
        await planWith('impact-b@example.com', tomorrow, 'Pull-Up');
        await planWith('impact-past@example.com', '2020-01-01', 'Pull-Up');
        await planWith('impact-bodyweight@example.com', today, 'Push-Up');

        const impact = await caller.catalog.equipmentImpact({ equipmentId: bar.id });

        expect(impact).toEqual({
          equipmentId: bar.id,
          name: 'Pull-up Bar',
          isAvailable: true,
          newlyBlockedPlanCount: 2,
          todayPlanCount: 1,
          affectedMemberCount: 2,
        });
      });

      it('does not count an exercise that has a working alternative, and counts nothing for a piece already down', async () => {
        const caller = await callerFor(await adminToken());
        const equipment = await caller.catalog.listEquipment();
        const bench = equipment.find((item) => item.name === 'Bench')!;
        const barbell = equipment.find((item) => item.name === 'Barbell')!;
        await planWith('impact-bench@example.com', todayLocal(), 'Barbell Bench Press');

        expect(await caller.catalog.equipmentImpact({ equipmentId: bench.id })).toMatchObject({
          newlyBlockedPlanCount: 0,
          todayPlanCount: 1,
        });

        await caller.catalog.setEquipmentAvailability({ id: bench.id, isAvailable: false });
        expect(await caller.catalog.equipmentImpact({ equipmentId: barbell.id })).toMatchObject({
          newlyBlockedPlanCount: 1,
          affectedMemberCount: 1,
        });
        expect(await caller.catalog.equipmentImpact({ equipmentId: bench.id })).toMatchObject({
          isAvailable: false,
          newlyBlockedPlanCount: 0,
          todayPlanCount: 0,
        });
      });

      it('answers not found for an unknown piece', async () => {
        const caller = await callerFor(await adminToken());

        await expect(
          caller.catalog.equipmentImpact({ equipmentId: '00000000-0000-0000-0000-000000000000' }),
        ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      });
    });

    describe('equipment links', () => {
      it('replaces the exercises a piece serves and leaves every other piece untouched', async () => {
        const caller = await callerFor(await adminToken());
        const kettlebell = (await caller.catalog.listEquipment()).find((item) => item.name === 'Kettlebell')!;
        const exercises = await caller.catalog.list();
        const pullUp = exercises.find((exercise) => exercise.name === 'Pull-Up')!;
        const pushUp = exercises.find((exercise) => exercise.name === 'Push-Up')!;

        const result = await caller.catalog.setEquipmentLinks({
          equipmentId: kettlebell.id,
          exerciseIds: [pullUp.id, pushUp.id, pullUp.id],
        });

        expect(result.exerciseIds).toEqual([pullUp.id, pushUp.id]);
        const after = await caller.catalog.list();
        const linkedTo = (id: string) =>
          after.find((exercise) => exercise.id === id)!.equipment.map((item) => item.name);
        expect(linkedTo(pullUp.id)).toEqual(expect.arrayContaining(['Pull-up Bar', 'Kettlebell']));
        expect(linkedTo(pushUp.id)).toEqual(['Kettlebell']);
        const previouslyLinked = exercises.filter((exercise) =>
          exercise.equipment.some((item) => item.id === kettlebell.id),
        );
        for (const exercise of previouslyLinked) {
          if (exercise.id === pullUp.id || exercise.id === pushUp.id) continue;
          expect(linkedTo(exercise.id)).not.toContain('Kettlebell');
        }
        expect(after).toHaveLength(exercises.length);

        await caller.catalog.setEquipmentLinks({ equipmentId: kettlebell.id, exerciseIds: [] });
        expect(
          (await caller.catalog.list()).some((exercise) => exercise.equipment.some((i) => i.id === kettlebell.id)),
        ).toBe(false);
      });

      it('refuses an exercise that does not exist, and changes nothing', async () => {
        const caller = await callerFor(await adminToken());
        const kettlebell = (await caller.catalog.listEquipment()).find((item) => item.name === 'Kettlebell')!;
        const before = await caller.catalog.list();

        await expect(
          caller.catalog.setEquipmentLinks({
            equipmentId: kettlebell.id,
            exerciseIds: [before[0]!.id, '00000000-0000-4000-8000-000000000000'],
          }),
        ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
        expect(await caller.catalog.list()).toEqual(before);
      });

      it('answers not found for an unknown piece', async () => {
        const caller = await callerFor(await adminToken());

        await expect(
          caller.catalog.setEquipmentLinks({ equipmentId: '00000000-0000-4000-8000-000000000000', exerciseIds: [] }),
        ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      });
    });
  });
});
