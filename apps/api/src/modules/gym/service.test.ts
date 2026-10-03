import { db, pool } from '@api/db/client';
import {
  dExerciseEquipment,
  dExerciseMuscles,
  dExercises,
  dGymEquipment,
  dUsers,
  fCheckIns,
  fTrainingPlanExercises,
  fTrainingPlans,
} from '@api/db/schema';
import { seedBase } from '@api/db/seed';
import { getGymAdminDetail, getGymInfo, getNextChange } from '@api/modules/gym/service';
import { resetTestDatabase } from '@api/test/database';
import { DEFAULT_OPENING_HOURS, OCCUPANCY_WINDOW_MINUTES } from '@cadence/shared/schemas/gym';
import type { MuscleId } from '@cadence/shared/schemas/muscles';
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

async function createExercise(name: string, muscle: MuscleId, equipment: { name: string; isAvailable: boolean }[]) {
  const [exercise] = await db.insert(dExercises).values({ name, instructions: 'Do it' }).returning();
  await db.insert(dExerciseMuscles).values({ exerciseId: exercise!.id, muscle, role: 'primary' });
  for (const item of equipment) {
    const [created] = await db.insert(dGymEquipment).values(item).returning();
    await db.insert(dExerciseEquipment).values({ exerciseId: exercise!.id, equipmentId: created!.id });
  }
  return exercise!;
}

async function addPlan(userId: string, planDate: string, exerciseIds: string[]) {
  const [plan] = await db.insert(fTrainingPlans).values({ userId, planDate, status: 'ai_published' }).returning();
  await db.insert(fTrainingPlanExercises).values(
    exerciseIds.map((exerciseId, orderIndex) => ({
      trainingPlanId: plan!.id,
      exerciseId,
      sets: 3,
      reps: 10,
      orderIndex,
    })),
  );
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

    it('counts check-ins at the current instant but not later ones, whatever the turnstile status', async () => {
      const member = await createMember('occupancy-now@example.com');
      const now = at(MONDAY, '12:00:00');
      await checkIn(member.id, now);
      await db
        .insert(fCheckIns)
        .values({ userId: member.id, checkedInAt: at(MONDAY, '11:00:00'), turnstileStatus: 'failed' });
      await checkIn(member.id, new Date(now.getTime() + 1));

      expect((await getGymInfo(now)).occupancyEstimate).toBe(2);
    });
  });

  describe('demand today', () => {
    it('weighs muscles and counts available equipment for members checked in today only', async () => {
      const now = at(MONDAY, '12:00:00');
      const present = await createMember('present@example.com');
      const absent = await createMember('absent@example.com');
      const yesterdayOnly = await createMember('yesterday@example.com');
      await checkIn(present.id, at(MONDAY, '08:00:00'));
      await checkIn(present.id, at(MONDAY, '11:00:00'));
      await checkIn(yesterdayOnly.id, at('2026-03-01', '18:00:00'));

      const bench = await createExercise('Gym bench press', 'chest', [{ name: 'Gym bench', isAvailable: true }]);
      const squat = await createExercise('Gym squat', 'quads', [{ name: 'Gym rack', isAvailable: true }]);
      await addPlan(present.id, MONDAY, [bench.id, squat.id]);
      await addPlan(absent.id, MONDAY, [bench.id]);
      await addPlan(yesterdayOnly.id, MONDAY, [bench.id]);
      await addPlan(present.id, '2026-03-03', [bench.id]);

      const { demand } = await getGymInfo(now);

      expect(demand.muscleLoad).toEqual({ chest: 3, quads: 3 });
      expect(demand.equipment).toEqual([
        { name: 'Gym bench', count: 1 },
        { name: 'Gym rack', count: 1 },
      ]);
    });

    it('never counts an exercise whose only equipment is unavailable', async () => {
      const member = await createMember('broken@example.com');
      await checkIn(member.id, at(MONDAY, '08:00:00'));
      const broken = await createExercise('Gym press', 'front-deltoid', [
        { name: 'Broken machine', isAvailable: false },
      ]);
      await addPlan(member.id, MONDAY, [broken.id]);

      const { demand } = await getGymInfo(at(MONDAY, '12:00:00'));

      expect(demand).toEqual({ muscleLoad: {}, equipment: [] });
    });

    it('counts an exercise with one available alternative but not its unavailable equipment', async () => {
      const member = await createMember('alternative@example.com');
      await checkIn(member.id, at(MONDAY, '08:00:00'));
      const row = await createExercise('Gym row', 'lats', [
        { name: 'Cable row', isAvailable: true },
        { name: 'Broken row', isAvailable: false },
      ]);
      await addPlan(member.id, MONDAY, [row.id]);

      const { demand } = await getGymInfo(at(MONDAY, '12:00:00'));

      expect(demand.muscleLoad).toEqual({ lats: 3 });
      expect(demand.equipment).toEqual([{ name: 'Cable row', count: 1 }]);
    });

    it('counts a bodyweight exercise toward its muscle but adds no equipment', async () => {
      const member = await createMember('bodyweight@example.com');
      await checkIn(member.id, at(MONDAY, '08:00:00'));
      const pushUp = await createExercise('Gym push up', 'chest', []);
      await addPlan(member.id, MONDAY, [pushUp.id]);

      const { demand } = await getGymInfo(at(MONDAY, '12:00:00'));

      expect(demand).toEqual({ muscleLoad: { chest: 3 }, equipment: [] });
    });
  });

  describe('admin detail', () => {
    it('adds today’s check-ins per local hour', async () => {
      const member = await createMember('hourly@example.com');
      for (const time of ['07:00:00', '07:59:59', '08:00:00', '23:30:00']) await checkIn(member.id, at(MONDAY, time));
      await checkIn(member.id, at('2026-03-01', '07:30:00'));
      await checkIn(member.id, at('2026-03-03', '00:00:00'));

      const detail = await getGymAdminDetail(at(MONDAY, '12:00:00'));

      expect(detail.checkInsPerHour).toHaveLength(24);
      expect(detail.checkInsPerHour[7]).toEqual({ hour: 7, count: 2 });
      expect(detail.checkInsPerHour[8]).toEqual({ hour: 8, count: 1 });
      expect(detail.checkInsPerHour[23]).toEqual({ hour: 23, count: 1 });
      expect(detail.checkInsPerHour.reduce((total, entry) => total + entry.count, 0)).toBe(4);
      expect(detail.currentHour).toBe(12);
      expect(detail.isEstimate).toBe(true);
    });
  });
});
