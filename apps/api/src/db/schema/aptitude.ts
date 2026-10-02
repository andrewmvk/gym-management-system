import { dUsers } from '@api/db/schema/users';
import type { QuestionnaireAnswer } from '@cadence/shared/schemas/aptitude';
import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const aiResult = pgEnum('ai_result', ['cleared', 'not_cleared', 'pending_retry']);
export const certificateDecision = pgEnum('certificate_decision', ['cleared', 'not_cleared']);

// One row per applicant (unique user_id), updated in place by submitSignup/recheck: RN-01's
// "latest result" is this row's current ai_result, not a history of past submissions.
export const fAptitudeQuestionnaires = pgTable('f_aptitude_questionnaires', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => dUsers.id),
  answers: jsonb('answers').$type<QuestionnaireAnswer[]>().notNull(),
  aiResult: aiResult('ai_result').notNull(),
  aiNotes: text('ai_notes').notNull(),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AptitudeQuestionnaire = typeof fAptitudeQuestionnaires.$inferSelect;

// Every row here enters the admin queue regardless of ai_result (FR-6/RN-02) - there is no "only
// uncertain ones get reviewed" branch. admin_override_result is set on every review (confirm
// materializes ai_result into it too), so non-null always means "an admin has decided."
export const fMedicalCertificates = pgTable('f_medical_certificates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => dUsers.id),
  filePath: text('file_path').notNull(),
  aiResult: aiResult('ai_result').notNull(),
  aiNotes: text('ai_notes').notNull(),
  reviewedByUserId: uuid('reviewed_by_user_id').references(() => dUsers.id),
  adminReviewedAt: timestamp('admin_reviewed_at', { withTimezone: true }),
  adminOverrideResult: certificateDecision('admin_override_result'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
});

export type MedicalCertificate = typeof fMedicalCertificates.$inferSelect;
