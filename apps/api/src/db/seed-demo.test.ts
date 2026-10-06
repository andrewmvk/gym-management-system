import { db, pool } from '@api/db/client';
import {
  dUsers,
  fCheckIns,
  fOnboardingSubmissions,
  fPlanReviews,
  fProfileEvents,
  fTrainingPlanExercises,
  fTrainingPlans,
  fUserPolicyGroupOnUser,
} from '@api/db/schema';
import { seedBase } from '@api/db/seed';
import {
  DEMO_HISTORY_DAYS,
  DEMO_LAPSE_DAYS_AGO,
  DEMO_MEMBER_COUNT,
  DEMO_RECENT_CHECK_IN_MINUTES,
  DEMO_UPCOMING_PLAN_COUNT,
  seedDemo,
} from '@api/db/seed-demo';
import { getGymInfo } from '@api/modules/gym/service';
import { getOverview } from '@api/modules/plans/reviews-service';
import { resetTestDatabase } from '@api/test/database';
import { MEMBER_GROUP } from '@cadence/shared/auth';
import { and, count, eq, gt, isNotNull, isNull, like } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

// A Wednesday at 12:00, so the weekday opening hours apply.
const NOW = new Date(2026, 9, 7, 12, 0);

async function rowCounts() {
  const tables = [
    dUsers,
    fCheckIns,
    fTrainingPlans,
    fTrainingPlanExercises,
    fPlanReviews,
    fOnboardingSubmissions,
    fProfileEvents,
  ];
  const counts = await Promise.all(tables.map((table) => db.select({ value: count() }).from(table)));
  return counts.map(([row]) => row!.value);
}

describe('seedDemo', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });
  afterAll(() => pool.end());

  it('keeps the same counts when run twice', async () => {
    await seedDemo(db, NOW);
    const first = await rowCounts();
    await seedDemo(db, NOW);

    expect(await rowCounts()).toEqual(first);
  });

  it('creates fake registered members in the member group, a mix of active and inactive', async () => {
    await seedDemo(db, NOW);

    const members = await db.select().from(dUsers).where(like(dUsers.email, 'demo%@example.com'));
    expect(members).toHaveLength(DEMO_MEMBER_COUNT);
    expect(members.every((user) => user.passwordHash !== null)).toBe(true);
    expect(members.some((user) => user.membershipStatus === 'active')).toBe(true);
    expect(members.some((user) => user.membershipStatus === 'inactive')).toBe(true);
    expect(members.every((user) => user.referencePhotoPath === null)).toBe(true);

    const [memberships] = await db
      .select({ value: count() })
      .from(fUserPolicyGroupOnUser)
      .where(eq(fUserPolicyGroupOnUser.groupId, MEMBER_GROUP));
    expect(memberships!.value).toBe(DEMO_MEMBER_COUNT + 1);

    const [onboarding] = await db.select({ value: count() }).from(fOnboardingSubmissions);
    expect(onboarding!.value).toBe(DEMO_MEMBER_COUNT);
  });

  it('builds a plan per member for the last 21 days plus today, with some trainer edits and reviews', async () => {
    await seedDemo(db, NOW);

    const members = await db.select().from(dUsers).where(like(dUsers.email, 'demo%@example.com'));
    const inactiveCount = members.filter((user) => user.membershipStatus === 'inactive').length;
    const activeCount = DEMO_MEMBER_COUNT - inactiveCount;
    const [plans] = await db.select({ value: count() }).from(fTrainingPlans);
    expect(plans!.value).toBe(
      activeCount * (DEMO_HISTORY_DAYS + 1) +
        inactiveCount * (DEMO_HISTORY_DAYS + 1 - DEMO_LAPSE_DAYS_AGO) +
        DEMO_UPCOMING_PLAN_COUNT,
    );
    const edited = await db.select().from(fTrainingPlans).where(eq(fTrainingPlans.status, 'trainer_edited'));
    expect(edited.length).toBeGreaterThan(0);
    const [reviews] = await db.select({ value: count() }).from(fPlanReviews);
    expect(reviews!.value).toBeGreaterThanOrEqual(edited.length);
  });

  it('adds a plan for tomorrow with nothing ticked, and trainer notes on today’s plans', async () => {
    await seedDemo(db, NOW);

    const upcoming = await db.select().from(fTrainingPlans).where(gt(fTrainingPlans.planDate, '2026-10-07'));
    expect(upcoming).toHaveLength(DEMO_UPCOMING_PLAN_COUNT);
    const notes = await db
      .select({ note: fPlanReviews.note, planDate: fTrainingPlans.planDate })
      .from(fPlanReviews)
      .innerJoin(fTrainingPlans, eq(fTrainingPlans.id, fPlanReviews.trainingPlanId))
      .where(and(eq(fTrainingPlans.planDate, '2026-10-07'), eq(fPlanReviews.isEdit, false)));
    expect(notes.length).toBeGreaterThanOrEqual(1);
  });

  it('remembers facts for several members, one of them already resolved', async () => {
    await seedDemo(db, NOW);

    const events = await db.select().from(fProfileEvents);
    expect(new Set(events.map((event) => event.eventType))).toEqual(
      new Set([
        'injury',
        'medication_change',
        'skipped_exercise',
        'state_update',
        'life_event',
        'plan_adjustment_request',
      ]),
    );
    expect(events.every((event) => event.sourceMessage)).toBe(true);
    const [resolved] = await db
      .select({ value: count() })
      .from(fProfileEvents)
      .where(isNotNull(fProfileEvents.resolvedAt));
    const [open] = await db.select({ value: count() }).from(fProfileEvents).where(isNull(fProfileEvents.resolvedAt));
    expect(resolved!.value).toBe(1);
    expect(open!.value).toBeGreaterThan(1);
  });

  it('lets a lapsed member show up in the history only until the lapse', async () => {
    await seedDemo(db, NOW);

    const [lapsed] = await db
      .select()
      .from(dUsers)
      .where(and(like(dUsers.email, 'demo%@example.com'), eq(dUsers.membershipStatus, 'inactive')))
      .limit(1);
    const lapseDate = new Date(2026, 9, 7 - DEMO_LAPSE_DAYS_AGO);
    const checkIns = await db.select().from(fCheckIns).where(eq(fCheckIns.userId, lapsed!.id));
    const plans = await db.select().from(fTrainingPlans).where(eq(fTrainingPlans.userId, lapsed!.id));

    expect(checkIns.length).toBeGreaterThan(0);
    expect(plans.length).toBeGreaterThan(0);
    expect(
      checkIns.every((checkIn) => checkIn.checkedInAt <= new Date(lapseDate.getTime() + 24 * 60 * 60 * 1000)),
    ).toBe(true);
    expect(plans.every((plan) => plan.planDate <= '2026-09-27')).toBe(true);
  });

  it('has no applicants: every account in the system has completed registration or is staff', async () => {
    await seedDemo(db, NOW);

    const [withoutPassword] = await db.select({ value: count() }).from(dUsers).where(isNull(dUsers.passwordHash));
    expect(withoutPassword!.value).toBe(0);
  });

  it('gives every demo member physical information, and exams to some', async () => {
    await seedDemo(db, NOW);

    const submissions = await db.select().from(fOnboardingSubmissions);
    expect(submissions.every((row) => row.heightCm >= 100 && row.weightKg >= 30)).toBe(true);
    expect(submissions.some((row) => row.exams.length > 0)).toBe(true);
    expect(submissions.some((row) => row.exams.length === 0)).toBe(true);
    expect(submissions.flatMap((row) => row.exams).every((exam) => exam.name !== '' && exam.findings !== '')).toBe(
      true,
    );
  });

  it('puts check-ins in the last 90 minutes, so the occupancy is not zero right after seeding', async () => {
    await seedDemo(db, NOW);

    const info = await getGymInfo(NOW);
    expect(info.occupancyEstimate).toBe(DEMO_RECENT_CHECK_IN_MINUTES.length);
  });

  it('gives the staff overview today’s demand to show', async () => {
    await seedDemo(db, NOW);

    const overview = await getOverview(NOW);
    expect(overview.planCount).toBeGreaterThan(0);
    expect(Object.keys(overview.musclePlans).length).toBeGreaterThan(0);
    expect(overview.checkedInPlanCount).toBeGreaterThanOrEqual(DEMO_RECENT_CHECK_IN_MINUTES.length);
    expect(overview.checkedInPlanCount).toBeLessThanOrEqual(overview.planCount);
    expect(overview.equipment.some((piece) => piece.planCount > 0)).toBe(true);
  });
});
