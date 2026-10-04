import { db, pool } from '@api/db/client';
import { dUsers, fProfileEvents, fUserPolicyOnUser } from '@api/db/schema';
import { SEED_ADMIN_EMAIL, seedBase } from '@api/db/seed';
import { logger } from '@api/lib/logger';
import { signSessionToken } from '@api/modules/auth/session';
import { resetTestDatabase } from '@api/test/database';
import { appRouter } from '@api/trpc/app-router';
import { createContext } from '@api/trpc/context';
import { createCallerFactory } from '@api/trpc/procedures';
import { MEMBER_POLICY_IDS } from '@cadence/shared/auth';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

async function createMember(email = 'profile-member@example.com') {
  const [user] = await db.insert(dUsers).values({ email, name: 'Profile Member' }).returning();
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

async function addEvent(userId: string, eventType: 'injury' | 'muscle_focus_changed', description: string, at: Date) {
  const [row] = await db
    .insert(fProfileEvents)
    .values({ userId, eventType, payload: { description }, sourceMessage: 'said in chat', createdAt: at })
    .returning();
  return row!;
}

describe('profile router', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });
  afterAll(() => pool.end());

  it('refuses a signed-out caller and a staff account without the policy', async () => {
    const [admin] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_ADMIN_EMAIL));

    await expect((await callerFor()).profile.listMine()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect((await callerFor(signSessionToken(admin!.id))).profile.listMine()).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('lists only the member own facts, newest first, without muscle focus changes', async () => {
    const member = await createMember();
    const other = await createMember('profile-other@example.com');
    await addEvent(member.id, 'injury', 'older knee pain', new Date('2026-09-01T10:00:00Z'));
    await addEvent(member.id, 'injury', 'newer wrist pain', new Date('2026-09-20T10:00:00Z'));
    await addEvent(
      member.id,
      'muscle_focus_changed',
      'Muscle focus for Chest changed',
      new Date('2026-09-25T10:00:00Z'),
    );
    await addEvent(other.id, 'injury', 'someone else', new Date('2026-09-10T10:00:00Z'));

    const rows = await (await callerFor(signSessionToken(member.id))).profile.listMine();

    expect(rows.map((row) => row.payload)).toEqual([
      { description: 'newer wrist pain' },
      { description: 'older knee pain' },
    ]);
    expect(rows[0]).toMatchObject({ eventType: 'injury', sourceMessage: 'said in chat', resolvedAt: null });
  });

  it('marks a fact resolved and clears it again', async () => {
    const member = await createMember();
    const caller = await callerFor(signSessionToken(member.id));
    const event = await addEvent(member.id, 'injury', 'sore knee', new Date());

    const resolved = await caller.profile.setResolved({ id: event.id, resolved: true });
    expect(resolved.resolvedAt).toBeInstanceOf(Date);

    const reopened = await caller.profile.setResolved({ id: event.id, resolved: false });
    expect(reopened.resolvedAt).toBeNull();
  });

  it('does not let a member resolve another member fact', async () => {
    const member = await createMember();
    const other = await createMember('profile-other@example.com');
    const event = await addEvent(other.id, 'injury', 'not yours', new Date());
    const caller = await callerFor(signSessionToken(member.id));

    await expect(caller.profile.setResolved({ id: event.id, resolved: true })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    const [row] = await db.select().from(fProfileEvents).where(eq(fProfileEvents.id, event.id));
    expect(row?.resolvedAt).toBeNull();
  });
});
