import { db, pool } from '@api/db/client';
import { dUsers, fProfileEvents } from '@api/db/schema';
import { seedBase } from '@api/db/seed';
import { getFocus, setFocus } from '@api/modules/focus/service';
import { resetTestDatabase } from '@api/test/database';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

async function createMember(email = 'focus-member@example.com') {
  const [user] = await db.insert(dUsers).values({ email, name: 'Focus Test Member' }).returning();
  return user!;
}

async function focusEvents(userId: string) {
  const events = await db.select().from(fProfileEvents).where(eq(fProfileEvents.userId, userId));
  return events.filter((event) => event.eventType === 'muscle_focus_changed');
}

describe('muscle focus', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });
  afterAll(() => pool.end());

  it('starts empty', async () => {
    const member = await createMember();

    expect(await getFocus(member.id)).toEqual([]);
  });

  it('saves a bias and records the change as a profile event', async () => {
    const member = await createMember();

    const focus = await setFocus(member.id, { muscle: 'glutes', bias: 2 });

    expect(focus).toEqual([{ muscle: 'glutes', bias: 2 }]);
    const [event] = await focusEvents(member.id);
    expect(event?.payload).toMatchObject({ muscle: 'glutes', from: 0, to: 2 });
  });

  it('replaces the bias of a muscle instead of adding a second row', async () => {
    const member = await createMember();
    await setFocus(member.id, { muscle: 'chest', bias: 1 });

    const focus = await setFocus(member.id, { muscle: 'chest', bias: -2 });

    expect(focus).toEqual([{ muscle: 'chest', bias: -2 }]);
    expect(await focusEvents(member.id)).toHaveLength(2);
  });

  it('removes the row when a muscle goes back to normal', async () => {
    const member = await createMember();
    await setFocus(member.id, { muscle: 'lats', bias: 1 });

    expect(await setFocus(member.id, { muscle: 'lats', bias: 0 })).toEqual([]);
  });

  it('records nothing when the level does not change', async () => {
    const member = await createMember();
    await setFocus(member.id, { muscle: 'calves', bias: 1 });

    await setFocus(member.id, { muscle: 'calves', bias: 1 });
    await setFocus(member.id, { muscle: 'neck', bias: 0 });

    expect(await focusEvents(member.id)).toHaveLength(1);
  });

  it('keeps each member separate', async () => {
    const first = await createMember('focus-a@example.com');
    const second = await createMember('focus-b@example.com');

    await setFocus(first.id, { muscle: 'biceps', bias: 2 });

    expect(await getFocus(second.id)).toEqual([]);
  });
});
