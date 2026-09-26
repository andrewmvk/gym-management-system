import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { dUsers } from '@api/db/schema/users';

// Append-only (FR-46, RN-12): a new consent is a new row, never an edit to an old one, so the system
// can always prove what a member agreed to and when, not just what is true today.
export const fConsentEvents = pgTable('f_consent_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => dUsers.id),
  consentType: text('consent_type').notNull(),
  consentVersion: text('consent_version').notNull(),
  consentedAt: timestamp('consented_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ConsentEvent = typeof fConsentEvents.$inferSelect;
