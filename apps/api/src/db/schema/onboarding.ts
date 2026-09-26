import type { ExamAttachmentPaths, Medications, PhysicalConditions } from '@cadence/shared/schemas/onboarding';
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { dUsers } from '@api/db/schema/users';

// Append-friendly (FR-14): a member may add more onboarding info over time, so a new submission is
// always a new row, never an update to a previous one.
export const fOnboardingSubmissions = pgTable('f_onboarding_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => dUsers.id),
  medications: jsonb('medications').$type<Medications>().notNull(),
  physicalConditions: jsonb('physical_conditions').$type<PhysicalConditions>().notNull(),
  goals: text('goals').notNull(),
  examAttachmentPaths: jsonb('exam_attachment_paths').$type<ExamAttachmentPaths>().notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
});

export type OnboardingSubmission = typeof fOnboardingSubmissions.$inferSelect;
