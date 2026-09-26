import { MEMBER_POLICY_IDS } from '@cadence/shared/auth';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, pool } from '@api/db/client';
import { dUsers, fUserPolicyOnUser } from '@api/db/schema';
import { SEED_ADMIN_EMAIL, seedBase } from '@api/db/seed';
import { logger } from '@api/lib/logger';
import { SESSION_COOKIE, signSessionToken } from '@api/modules/auth/session';
import { resetTestDatabase } from '@api/test/database';
import { appRouter } from '@api/trpc/app-router';
import { createContext } from '@api/trpc/context';
import { createCallerFactory } from '@api/trpc/procedures';

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

  it('lists the seeded exercises with computed availability, without needing a session', async () => {
    const caller = await callerFor();

    const exercises = await caller.catalog.list();

    expect(exercises.length).toBeGreaterThanOrEqual(25);
    const bodyweight = exercises.find((exercise) => exercise.name === 'Bodyweight Squat');
    expect(bodyweight?.isAvailable).toBe(true);
    const rowing = exercises.find((exercise) => exercise.name === 'Rowing Machine Sprint');
    expect(rowing?.isAvailable).toBe(false);
  });

  it('lists the seeded equipment, including the two unavailable items', async () => {
    const caller = await callerFor();

    const equipment = await caller.catalog.listEquipment();

    expect(equipment.length).toBeGreaterThanOrEqual(12);
    expect(equipment.filter((item) => !item.isAvailable).map((item) => item.name).sort()).toEqual([
      'Rowing Machine',
      'Stationary Bike',
    ]);
  });

  describe('a member without the catalog-management policy', () => {
    it('is forbidden from creating an exercise', async () => {
      const caller = await callerFor(await memberToken());

      await expect(
        caller.catalog.createExercise({ name: 'Test Exercise', muscleGroup: 'legs', instructions: 'Do it.', equipmentIds: [] }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('is forbidden from creating equipment', async () => {
      const caller = await callerFor(await memberToken());

      await expect(caller.catalog.createEquipment({ name: 'Test Equipment' })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    });

    it('is forbidden from toggling equipment availability', async () => {
      const caller = await callerFor(await memberToken());
      const [equipment] = await caller.catalog.listEquipment();

      await expect(caller.catalog.toggleEquipmentAvailability({ id: equipment!.id })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    });
  });

  describe('an admin', () => {
    it('can create an exercise linked to equipment', async () => {
      const caller = await callerFor(await adminToken());
      const [barbell] = (await caller.catalog.listEquipment()).filter((item) => item.name === 'Barbell');

      const exercise = await caller.catalog.createExercise({
        name: 'Test Deadlift',
        muscleGroup: 'back',
        instructions: 'Hinge and lift.',
        equipmentIds: [barbell!.id],
      });

      const [reloaded] = (await caller.catalog.list()).filter((item) => item.id === exercise.id);
      expect(reloaded?.equipment.map((item) => item.id)).toEqual([barbell!.id]);
    });

    it('can create a new piece of equipment', async () => {
      const caller = await callerFor(await adminToken());

      const equipment = await caller.catalog.createEquipment({ name: 'Battle Ropes' });

      expect(equipment.name).toBe('Battle Ropes');
      expect(equipment.isAvailable).toBe(true);
    });

    it('can toggle one piece of equipment without affecting the others', async () => {
      const caller = await callerFor(await adminToken());
      const before = await caller.catalog.listEquipment();
      const treadmill = before.find((item) => item.name === 'Treadmill')!;

      const updated = await caller.catalog.toggleEquipmentAvailability({ id: treadmill.id });

      expect(updated.isAvailable).toBe(false);
      const after = await caller.catalog.listEquipment();
      for (const item of after) {
        if (item.id === treadmill.id) continue;
        expect(item.isAvailable).toBe(before.find((original) => original.id === item.id)!.isAvailable);
      }
    });
  });
});
