import { dUsers } from '@api/db/schema/users';
import type { Exams, Medications, PhysicalConditions } from '@cadence/shared/schemas/onboarding';
import { integer, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Append-friendly (FR-14): a member may add more onboarding info over time, so a new submission is
// always a new row, never an update to a previous one.
export const fOnboardingSubmissions = pgTable('f_onboarding_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => dUsers.id),
  heightCm: integer('height_cm').notNull(),
  weightKg: numeric('weight_kg', { precision: 4, scale: 1, mode: 'number' }).notNull(),
  medications: jsonb('medications').$type<Medications>().notNull(),
  physicalConditions: jsonb('physical_conditions').$type<PhysicalConditions>().notNull(),
  goals: text('goals').notNull(),
  exams: jsonb('exams').$type<Exams>().notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
});

export type OnboardingSubmission = typeof fOnboardingSubmissions.$inferSelect;
