import type { QuestionnaireAnswer } from '@cadence/shared/schemas/aptitude';
import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { dUsers } from '@api/db/schema/users';

export const aiResult = pgEnum('ai_result', ['cleared', 'not_cleared', 'pending_retry']);

// One row per applicant (unique user_id), updated in place by submitQuestionnaire/recheck: RN-01's
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
