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

async function addEvent(userId: string, eventType: 'injury', description: string, at: Date) {
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

  it('lists only the member own facts, newest first', async () => {
    const member = await createMember();
    const other = await createMember('profile-other@example.com');
    await addEvent(member.id, 'injury', 'older knee pain', new Date('2026-09-01T10:00:00Z'));
    await addEvent(member.id, 'injury', 'newer wrist pain', new Date('2026-09-20T10:00:00Z'));
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

  describe('pending facts', () => {
    async function addPending(userId: string, description: string) {
      const [row] = await db
        .insert(fProfileEvents)
        .values({ userId, eventType: 'injury', payload: { description, muscles: ['quads'] }, confirmedAt: null })
        .returning();
      return row!;
    }

    it('lists a pending fact so the member can confirm it, and hides a dismissed one', async () => {
      const member = await createMember();
      const caller = await callerFor(signSessionToken(member.id));
      const pending = await addPending(member.id, 'sore knee');
      const dismissed = await addPending(member.id, 'not really');
      await caller.profile.dismissFact({ id: dismissed.id });

      const rows = await caller.profile.listMine();

      expect(rows.map((row) => row.id)).toEqual([pending.id]);
      expect(rows[0]?.confirmedAt).toBeNull();
    });

    it('confirms a fact, optionally with a corrected description, and keeps the muscles', async () => {
      const member = await createMember();
      const caller = await callerFor(signSessionToken(member.id));
      const first = await addPending(member.id, 'sore knee');
      const second = await addPending(member.id, 'sore hip');

      await caller.profile.confirmFacts({ facts: [{ id: first.id }, { id: second.id, description: 'tight hip' }] });

      const rows = await caller.profile.listMine();
      expect(rows.every((row) => row.confirmedAt instanceof Date)).toBe(true);
      expect(rows.find((row) => row.id === second.id)?.payload).toEqual({
        description: 'tight hip',
        muscles: ['quads'],
      });
      await expect(caller.profile.confirmFacts({ facts: [{ id: first.id }] })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('does not let a member confirm or dismiss another member fact', async () => {
      const member = await createMember();
      const other = await createMember('profile-other@example.com');
      const pending = await addPending(other.id, 'not yours');
      const caller = await callerFor(signSessionToken(member.id));

      await expect(caller.profile.confirmFacts({ facts: [{ id: pending.id }] })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
      await expect(caller.profile.dismissFact({ id: pending.id })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });

    it('lists only confirmed, unresolved injuries that name a muscle as active injuries', async () => {
      const member = await createMember();
      const caller = await callerFor(signSessionToken(member.id));
      await db.insert(fProfileEvents).values([
        { userId: member.id, eventType: 'injury', payload: { description: 'sore knee', muscles: ['quads'] } },
        { userId: member.id, eventType: 'injury', payload: { description: 'old, untagged' } },
        {
          userId: member.id,
          eventType: 'injury',
          payload: { description: 'healed', muscles: ['calves'] },
          resolvedAt: new Date(),
        },
        {
          userId: member.id,
          eventType: 'injury',
          payload: { description: 'pending', muscles: ['abs'] },
          confirmedAt: null,
        },
      ]);

      const injuries = await caller.profile.listActiveInjuries();

      expect(injuries.map((injury) => [injury.description, injury.muscles])).toEqual([['sore knee', ['quads']]]);
    });
  });
});
