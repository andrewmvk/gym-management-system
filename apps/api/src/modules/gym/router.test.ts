import { db, pool } from '@api/db/client';
import { dUsers, fUserPolicyGroupOnUser } from '@api/db/schema';
import { SEED_ADMIN_EMAIL, SEED_TRAINER_EMAIL, seedBase } from '@api/db/seed';
import { logger } from '@api/lib/logger';
import { signSessionToken } from '@api/modules/auth/session';
import { resetTestDatabase } from '@api/test/database';
import { appRouter } from '@api/trpc/app-router';
import { createContext } from '@api/trpc/context';
import { createCallerFactory } from '@api/trpc/procedures';
import { MEMBER_GROUP } from '@cadence/shared/auth';
import { DEFAULT_OPENING_HOURS } from '@cadence/shared/schemas/gym';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

async function callerFor(token?: string) {
  const req = { cookies: token ? { cadence_session: token } : {}, log: logger };
  const res = { cookie: () => {}, clearCookie: () => {} };
  const ctx = await createContext({ req, res } as never);
  return createCallerFactory(appRouter)(ctx);
}

describe('gym router', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });
  afterAll(() => pool.end());

  it('serves gym.info to a signed-out visitor', async () => {
    const info = await (await callerFor()).gym.info();

    expect(info).toMatchObject({ isEstimate: true, occupancyEstimate: 0 });
    expect(info).not.toHaveProperty('demand');
    expect(typeof info.isOpen).toBe('boolean');
  });

  describe('opening hours', () => {
    async function memberToken() {
      const [member] = await db
        .insert(dUsers)
        .values({ email: 'hours-member@example.com', name: 'Member' })
        .returning();
      await db.insert(fUserPolicyGroupOnUser).values({ userId: member!.id, groupId: MEMBER_GROUP });
      return signSessionToken(member!.id);
    }

    async function adminToken() {
      const [admin] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_ADMIN_EMAIL));
      return signSessionToken(admin!.id);
    }

    it('lets an admin read and replace the hours, null meaning closed', async () => {
      const caller = await callerFor(await adminToken());
      expect(await caller.gym.getHours()).toEqual(DEFAULT_OPENING_HOURS);

      const updated = { ...DEFAULT_OPENING_HOURS, monday: null, sunday: { open: '10:00', close: '13:30' } };
      expect(await caller.gym.updateHours(updated)).toEqual(updated);
      expect(await caller.gym.getHours()).toEqual(updated);
      expect(await (await callerFor()).gym.info()).toMatchObject({ isEstimate: true });
    });

    it('rejects a day that closes at or before it opens', async () => {
      const caller = await callerFor(await adminToken());

      await expect(
        caller.gym.updateHours({ ...DEFAULT_OPENING_HOURS, monday: { open: '10:00', close: '10:00' } }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      await expect(
        caller.gym.updateHours({ ...DEFAULT_OPENING_HOURS, monday: { open: '18:00', close: '09:00' } }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      expect(await caller.gym.getHours()).toEqual(DEFAULT_OPENING_HOURS);
    });

    it('refuses a member, a trainer and a signed-out visitor', async () => {
      const [trainer] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_TRAINER_EMAIL));

      for (const token of [await memberToken(), signSessionToken(trainer!.id)]) {
        const caller = await callerFor(token);
        await expect(caller.gym.getHours()).rejects.toMatchObject({ code: 'FORBIDDEN' });
        await expect(caller.gym.updateHours(DEFAULT_OPENING_HOURS)).rejects.toMatchObject({ code: 'FORBIDDEN' });
      }
      await expect((await callerFor()).gym.getHours()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });
  });

  it('gives the hourly detail to a holder of read_checkins and refuses everyone else', async () => {
    const [admin] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_ADMIN_EMAIL));
    const detail = await (await callerFor(signSessionToken(admin!.id))).gym.adminDetail();
    expect(detail.checkInsPerHour).toHaveLength(24);

    const [member] = await db.insert(dUsers).values({ email: 'gym-member@example.com', name: 'Member' }).returning();
    await db.insert(fUserPolicyGroupOnUser).values({ userId: member!.id, groupId: MEMBER_GROUP });

    await expect((await callerFor(signSessionToken(member!.id))).gym.adminDetail()).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect((await callerFor()).gym.adminDetail()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
