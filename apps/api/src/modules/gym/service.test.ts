import { db, pool } from '@api/db/client';
import { dUsers, fCheckIns } from '@api/db/schema';
import { seedBase } from '@api/db/seed';
import {
  getGymAdminDetail,
  getGymInfo,
  getNextChange,
  getOpeningHours,
  updateOpeningHours,
} from '@api/modules/gym/service';
import { resetTestDatabase } from '@api/test/database';
import { DEFAULT_OPENING_HOURS, OCCUPANCY_WINDOW_MINUTES } from '@cadence/shared/schemas/gym';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

// Local-time constructors: 2026-03-02 is a Monday, 2026-03-07 a Saturday and 2026-03-08 a Sunday.
const MONDAY = '2026-03-02';
const SATURDAY = '2026-03-07';
const SUNDAY = '2026-03-08';

function at(date: string, time: string) {
  return new Date(`${date}T${time}`);
}

async function createMember(email: string) {
  const [member] = await db.insert(dUsers).values({ email, name: email, aptitudeStatus: 'cleared' }).returning();
  return member!;
}

async function checkIn(userId: string, when: Date) {
  await db.insert(fCheckIns).values({ userId, checkedInAt: when, turnstileStatus: 'success' });
}

describe('gym info service', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });
  afterAll(() => pool.end());

  describe('open or closed', () => {
    it('is open from the opening minute and closed from the closing minute', async () => {
      expect((await getGymInfo(at(MONDAY, '05:59:59'))).isOpen).toBe(false);
      expect((await getGymInfo(at(MONDAY, '06:00:00'))).isOpen).toBe(true);
      expect((await getGymInfo(at(MONDAY, '21:59:59'))).isOpen).toBe(true);
      expect((await getGymInfo(at(MONDAY, '22:00:00'))).isOpen).toBe(false);
    });

    it('uses the Saturday hours and reports Sunday as closed all day', async () => {
      const saturday = await getGymInfo(at(SATURDAY, '13:59:00'));
      expect(saturday).toMatchObject({ isOpen: true, todayHours: { open: '08:00', close: '14:00' } });
      expect((await getGymInfo(at(SATURDAY, '14:00:00'))).isOpen).toBe(false);

      const sunday = await getGymInfo(at(SUNDAY, '12:00:00'));
      expect(sunday).toMatchObject({ isOpen: false, todayHours: null });
    });
  });

  describe('next change', () => {
    it('reports the closing time while open and the opening time before opening', () => {
      expect(getNextChange(DEFAULT_OPENING_HOURS, at(MONDAY, '12:00:00'))).toEqual({
        event: 'closes',
        day: 'today',
        time: '22:00',
      });
      expect(getNextChange(DEFAULT_OPENING_HOURS, at(MONDAY, '05:00:00'))).toEqual({
        event: 'opens',
        day: 'today',
        time: '06:00',
      });
    });

    it('points at tomorrow after closing and skips a closed Sunday', () => {
      expect(getNextChange(DEFAULT_OPENING_HOURS, at(MONDAY, '22:00:00'))).toEqual({
        event: 'opens',
        day: 'tomorrow',
        time: '06:00',
      });
      expect(getNextChange(DEFAULT_OPENING_HOURS, at(SATURDAY, '15:00:00'))).toEqual({
        event: 'opens',
        day: 'monday',
        time: '06:00',
      });
    });

    it('is null when the gym never opens', () => {
      const neverOpen = Object.fromEntries(Object.keys(DEFAULT_OPENING_HOURS).map((day) => [day, null]));
      expect(getNextChange(neverOpen as typeof DEFAULT_OPENING_HOURS, at(MONDAY, '12:00:00'))).toBeNull();
    });
  });

  describe('occupancy estimate', () => {
    it('changes exactly at the window boundary and is always labeled an estimate', async () => {
      const member = await createMember('occupancy@example.com');
      const now = at(MONDAY, '12:00:00');
      const boundary = new Date(now.getTime() - OCCUPANCY_WINDOW_MINUTES * 60 * 1000);

      await checkIn(member.id, boundary);
      expect(await getGymInfo(now)).toMatchObject({ occupancyEstimate: 1, isEstimate: true });

      await checkIn(member.id, new Date(boundary.getTime() - 1));
      expect((await getGymInfo(now)).occupancyEstimate).toBe(1);

      expect((await getGymInfo(new Date(now.getTime() + 1))).occupancyEstimate).toBe(0);
    });

    it('counts members checked in at the current instant but not later ones, whatever the turnstile status', async () => {
      const member = await createMember('occupancy-now@example.com');
      const other = await createMember('occupancy-other@example.com');
      const now = at(MONDAY, '12:00:00');
      await checkIn(member.id, now);
      await db
        .insert(fCheckIns)
        .values({ userId: other.id, checkedInAt: at(MONDAY, '11:00:00'), turnstileStatus: 'failed' });
      await checkIn(other.id, new Date(now.getTime() + 1));

      expect((await getGymInfo(now)).occupancyEstimate).toBe(2);
    });

    it('counts a member who re-scans inside the window once', async () => {
      const member = await createMember('occupancy-rescan@example.com');
      const now = at(MONDAY, '12:00:00');
      await checkIn(member.id, at(MONDAY, '11:00:00'));
      await checkIn(member.id, at(MONDAY, '11:45:00'));
      await checkIn(member.id, now);

      expect((await getGymInfo(now)).occupancyEstimate).toBe(1);
    });
  });

  describe('gym info contract', () => {
    it('carries no demand: that belongs to the staff overview', async () => {
      expect(await getGymInfo(at(MONDAY, '12:00:00'))).not.toHaveProperty('demand');
      expect(await getGymAdminDetail(at(MONDAY, '12:00:00'))).not.toHaveProperty('demand');
    });
  });

  describe('admin detail', () => {
    it('adds today’s members per local hour', async () => {
      const first = await createMember('hourly@example.com');
      const second = await createMember('hourly-second@example.com');
      for (const time of ['07:00:00', '08:00:00', '23:30:00']) await checkIn(first.id, at(MONDAY, time));
      await checkIn(second.id, at(MONDAY, '07:59:59'));
      await checkIn(first.id, at('2026-03-01', '07:30:00'));
      await checkIn(first.id, at('2026-03-03', '00:00:00'));

      const detail = await getGymAdminDetail(at(MONDAY, '12:00:00'));

      expect(detail.checkInsPerHour).toHaveLength(24);
      expect(detail.checkInsPerHour[7]).toEqual({ hour: 7, count: 2 });
      expect(detail.checkInsPerHour[8]).toEqual({ hour: 8, count: 1 });
      expect(detail.checkInsPerHour[23]).toEqual({ hour: 23, count: 1 });
      expect(detail.checkInsPerHour.reduce((total, entry) => total + entry.count, 0)).toBe(4);
      expect(detail.currentHour).toBe(12);
      expect(detail.isEstimate).toBe(true);
    });

    it('counts a member who scans twice in the same hour once in that hour', async () => {
      const member = await createMember('rescan@example.com');
      await checkIn(member.id, at(MONDAY, '07:00:00'));
      await checkIn(member.id, at(MONDAY, '07:20:00'));
      await checkIn(member.id, at(MONDAY, '09:00:00'));

      const detail = await getGymAdminDetail(at(MONDAY, '12:00:00'));

      expect(detail.checkInsPerHour[7]).toEqual({ hour: 7, count: 1 });
      expect(detail.checkInsPerHour[9]).toEqual({ hour: 9, count: 1 });
    });
  });

  describe('opening hours', () => {
    it('reads the stored hours and replaces them as a whole', async () => {
      expect(await getOpeningHours()).toEqual(DEFAULT_OPENING_HOURS);

      const updated = { ...DEFAULT_OPENING_HOURS, sunday: { open: '09:00', close: '12:00' }, monday: null };
      expect(await updateOpeningHours(updated)).toEqual(updated);
      expect(await getOpeningHours()).toEqual(updated);
      expect((await getGymInfo(at(MONDAY, '12:00:00'))).isOpen).toBe(false);
      expect((await getGymInfo(at(SUNDAY, '10:00:00'))).isOpen).toBe(true);
    });
  });
});
