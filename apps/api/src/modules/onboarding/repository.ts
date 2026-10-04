import { type DatabaseExecutor, db } from '@api/db/client';
import { fOnboardingSubmissions, type OnboardingSubmission } from '@api/db/schema';
import type { Exams, Medications, PhysicalConditions } from '@cadence/shared/schemas/onboarding';
import { desc, eq } from 'drizzle-orm';

export async function insertSubmission(
  input: {
    userId: string;
    heightCm: number;
    weightKg: number;
    medications: Medications;
    physicalConditions: PhysicalConditions;
    goals: string;
    exams: Exams;
  },
  executor: DatabaseExecutor = db,
): Promise<OnboardingSubmission> {
  const [submission] = await executor.insert(fOnboardingSubmissions).values(input).returning();
  return submission!;
}

export function findSubmissionsByUserId(
  userId: string,
  executor: DatabaseExecutor = db,
): Promise<OnboardingSubmission[]> {
  return executor
    .select()
    .from(fOnboardingSubmissions)
    .where(eq(fOnboardingSubmissions.userId, userId))
    .orderBy(desc(fOnboardingSubmissions.submittedAt));
}
