import { db, pool } from '@api/db/client';
import { dUsers, fCheckIns, fUserPolicyGroupOnUser } from '@api/db/schema';
import { SEED_ADMIN_EMAIL, SEED_TRAINER_EMAIL, seedBase } from '@api/db/seed';
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

async function tokenOf(email: string) {
  const [user] = await db.select().from(dUsers).where(eq(dUsers.email, email));
  return signSessionToken(user!.id);
}

describe('checkins router', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });
  afterAll(() => pool.end());

  it('gives the log and the summary to a holder of read_checkins', async () => {
    const [member] = await db
      .insert(dUsers)
      .values({ email: 'log-member@example.com', name: 'Log Member', aptitudeStatus: 'cleared' })
      .returning();
    await db.insert(fCheckIns).values([
      { userId: member!.id, turnstileStatus: 'success', turnstileResponse: { response: { httpStatus: 200 } } },
      { userId: member!.id, turnstileStatus: 'failed', turnstileResponse: { response: null, error: 'timeout' } },
    ]);
    const caller = await callerFor(await tokenOf(SEED_ADMIN_EMAIL));

    const log = await caller.checkins.listRecent();
    const summary = await caller.checkins.turnstileSummary();

    expect(log).toHaveLength(2);
    expect(log.map((entry) => entry.failureReason).sort()).toEqual([null, 'timeout']);
    expect(summary).toEqual({ failedToday: 1, totalToday: 2, isConfigured: false });
  });

  it('validates the limit: 1 to 100, 50 when left out', async () => {
    const caller = await callerFor(await tokenOf(SEED_ADMIN_EMAIL));

    await expect(caller.checkins.listRecent({ limit: 0 })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(caller.checkins.listRecent({ limit: 101 })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(caller.checkins.listRecent({ limit: 100 })).resolves.toEqual([]);
  });

  it('refuses a trainer, a member and a signed-out visitor', async () => {
    const [member] = await db
      .insert(dUsers)
      .values({ email: 'checkins-member@example.com', name: 'Member', aptitudeStatus: 'cleared' })
      .returning();
    await db.insert(fUserPolicyGroupOnUser).values({ userId: member!.id, groupId: MEMBER_GROUP });

    for (const token of [await tokenOf(SEED_TRAINER_EMAIL), signSessionToken(member!.id)]) {
      const caller = await callerFor(token);
      await expect(caller.checkins.listRecent()).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(caller.checkins.turnstileSummary()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }
    await expect((await callerFor()).checkins.listRecent()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
