import { db, pool } from '@api/db/client';
import { dUsers, fUserPolicyGroupOnUser } from '@api/db/schema';
import { SEED_ADMIN_EMAIL, seedBase } from '@api/db/seed';
import { logger } from '@api/lib/logger';
import { signSessionToken } from '@api/modules/auth/session';
import { resetTestDatabase } from '@api/test/database';
import { appRouter } from '@api/trpc/app-router';
import { createContext } from '@api/trpc/context';
import { createCallerFactory } from '@api/trpc/procedures';
import { MEMBER_GROUP } from '@cadence/shared/auth';
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

    expect(info).toMatchObject({ isEstimate: true, occupancyEstimate: 0, demand: { muscleLoad: {}, equipment: [] } });
    expect(typeof info.isOpen).toBe('boolean');
  });

  it('gives the hourly detail to a holder of read_checkins and refuses everyone else', async () => {
    const [admin] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_ADMIN_EMAIL));
    const detail = await (await callerFor(signSessionToken(admin!.id))).gym.adminDetail();
    expect(detail.checkInsPerHour).toHaveLength(24);

    const [member] = await db
      .insert(dUsers)
      .values({ email: 'gym-member@example.com', name: 'Member', aptitudeStatus: 'cleared' })
      .returning();
    await db.insert(fUserPolicyGroupOnUser).values({ userId: member!.id, groupId: MEMBER_GROUP });

    await expect((await callerFor(signSessionToken(member!.id))).gym.adminDetail()).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect((await callerFor()).gym.adminDetail()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
