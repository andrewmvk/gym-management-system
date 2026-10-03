import { db, pool } from '@api/db/client';
import {
  dUsers,
  fCheckIns,
  fMedicalCertificates,
  fOnboardingSubmissions,
  fPlanReviews,
  fTrainingPlanExercises,
  fTrainingPlans,
  fUserPolicyGroupOnUser,
} from '@api/db/schema';
import { seedBase } from '@api/db/seed';
import {
  DEMO_APPLICANT_COUNT,
  DEMO_HISTORY_DAYS,
  DEMO_MEMBER_COUNT,
  DEMO_RECENT_CHECK_IN_MINUTES,
  seedDemo,
} from '@api/db/seed-demo';
import { getGymInfo } from '@api/modules/gym/service';
import { resetTestDatabase } from '@api/test/database';
import { MEMBER_GROUP } from '@cadence/shared/auth';
import { count, eq, like } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

// A Wednesday at 12:00, so the weekday opening hours apply.
const NOW = new Date(2026, 9, 7, 12, 0);

async function rowCounts() {
  const tables = [dUsers, fCheckIns, fTrainingPlans, fTrainingPlanExercises, fPlanReviews, fMedicalCertificates];
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

  it('creates fake cleared members in the member group, a mix of active and inactive', async () => {
    await seedDemo(db, NOW);

    const members = await db.select().from(dUsers).where(like(dUsers.email, 'demo%@example.com'));
    const cleared = members.filter((user) => user.aptitudeStatus === 'cleared');
    expect(cleared).toHaveLength(DEMO_MEMBER_COUNT);
    expect(cleared.some((user) => user.membershipStatus === 'active')).toBe(true);
    expect(cleared.some((user) => user.membershipStatus === 'inactive')).toBe(true);
    expect(cleared.every((user) => user.referencePhotoPath === null)).toBe(true);

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

    const [plans] = await db.select({ value: count() }).from(fTrainingPlans);
    expect(plans!.value).toBe(DEMO_MEMBER_COUNT * (DEMO_HISTORY_DAYS + 1));
    const edited = await db.select().from(fTrainingPlans).where(eq(fTrainingPlans.status, 'trainer_edited'));
    expect(edited.length).toBeGreaterThan(0);
    const [reviews] = await db.select({ value: count() }).from(fPlanReviews);
    expect(reviews!.value).toBeGreaterThanOrEqual(edited.length);
  });

  it('covers every certificate result, pending_retry included', async () => {
    await seedDemo(db, NOW);

    const certificates = await db.select().from(fMedicalCertificates);
    expect(certificates).toHaveLength(DEMO_APPLICANT_COUNT);
    expect(new Set(certificates.map((row) => row.aiResult))).toEqual(
      new Set(['cleared', 'not_cleared', 'pending_retry']),
    );
    expect(certificates.some((row) => row.adminOverrideResult !== null)).toBe(true);
  });

  it('puts check-ins in the last 90 minutes, so the occupancy is not zero right after seeding', async () => {
    await seedDemo(db, NOW);

    const info = await getGymInfo(NOW);
    expect(info.occupancyEstimate).toBe(DEMO_RECENT_CHECK_IN_MINUTES.length);
    expect(info.demand.muscleGroups.length).toBeGreaterThan(0);
  });
});
