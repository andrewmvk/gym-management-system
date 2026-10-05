import { db, pool } from '@api/db/client';
import { dExercises, dUsers, fUserPolicyOnUser } from '@api/db/schema';
import { SEED_ADMIN_EMAIL, seedBase } from '@api/db/seed';
import { todayLocal } from '@api/lib/dates';
import { logger } from '@api/lib/logger';
import { signSessionToken } from '@api/modules/auth/session';
import { resetTestDatabase } from '@api/test/database';
import { appRouter } from '@api/trpc/app-router';
import { createContext } from '@api/trpc/context';
import { createCallerFactory } from '@api/trpc/procedures';
import { MEMBER_POLICY_IDS } from '@cadence/shared/auth';
import type { CoachStreamEvent } from '@cadence/shared/schemas/coach';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

async function createMember(email = 'chat-router-member@example.com') {
  const [user] = await db
    .insert(dUsers)
    .values({ email, name: 'Chat Router Member', passwordHash: await bcrypt.hash('password123', 4) })
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

async function send(caller: Caller, input: Parameters<Caller['chat']['send']>[0]) {
  const events: CoachStreamEvent[] = [];
  for await (const event of await caller.chat.send(input)) events.push(event);
  return events;
}

describe('chat router', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });
  afterAll(() => pool.end());

  describe('send', () => {
    it('refuses a signed-out caller', async () => {
      const caller = await callerFor();

      await expect(send(caller, { message: 'hello', mentions: [] })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });

    it('refuses a staff account that has no use_chat grant', async () => {
      const [admin] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_ADMIN_EMAIL));
      const caller = await callerFor(signSessionToken(admin!.id));

      await expect(send(caller, { message: 'hello', mentions: [] })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('refuses a message over 2000 characters and a mention of an unknown muscle', async () => {
      const member = await createMember();
      const caller = await callerFor(signSessionToken(member.id));

      await expect(send(caller, { message: 'a'.repeat(2001), mentions: [] })).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
      await expect(
        send(caller, { message: 'hi', mentions: [{ type: 'muscle', muscle: 'wings' as never }] }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });

    it('streams a reply for a signed-in member', async () => {
      const member = await createMember();
      const caller = await callerFor(signSessionToken(member.id));

      const events = await send(caller, { message: 'Hi, how is my plan looking?', mentions: [] });

      expect(events.some((event) => event.type === 'text' && event.delta.length > 0)).toBe(true);
    });
  });

  describe('applyDraft', () => {
    async function lungeId() {
      const [exercise] = await db
        .select({ id: dExercises.id })
        .from(dExercises)
        .where(eq(dExercises.name, 'Walking Lunge'));
      return exercise!.id;
    }

    it('refuses a signed-out caller and a staff account without update_own_plans', async () => {
      const [admin] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_ADMIN_EMAIL));
      const input = { date: todayLocal(), exercises: [{ exerciseId: await lungeId(), sets: 3, reps: 10 }] };

      await expect((await callerFor()).chat.applyDraft(input)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
      await expect((await callerFor(signSessionToken(admin!.id))).chat.applyDraft(input)).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    });

    it('rejects an invalid date and an empty exercise list', async () => {
      const member = await createMember();
      const caller = await callerFor(signSessionToken(member.id));

      await expect(
        caller.chat.applyDraft({ date: 'not-a-date', exercises: [{ exerciseId: await lungeId(), sets: 3, reps: 10 }] }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      await expect(caller.chat.applyDraft({ date: todayLocal(), exercises: [] })).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
    });

    it('lets a member apply a draft to a future day', async () => {
      const member = await createMember();
      const caller = await callerFor(signSessionToken(member.id));

      const result = await caller.chat.applyDraft({
        date: '2999-12-25',
        request: 'Easier',
        exercises: [{ exerciseId: await lungeId(), sets: 3, reps: 10 }],
      });

      expect(result).toMatchObject({ status: 'ok' });
    });
  });
});
