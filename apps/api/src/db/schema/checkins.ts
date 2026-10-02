import { dUsers } from '@api/db/schema/users';
import { TURNSTILE_METHODS, type TurnstileHeader } from '@cadence/shared/schemas/turnstile';
import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const turnstileStatus = pgEnum('turnstile_status', ['success', 'failed']);
export const turnstileMethod = pgEnum('turnstile_method', TURNSTILE_METHODS);

export const fCheckIns = pgTable('f_check_ins', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => dUsers.id),
  checkedInAt: timestamp('checked_in_at', { withTimezone: true }).notNull().defaultNow(),
  turnstileStatus: turnstileStatus('turnstile_status').notNull(),
  turnstileResponse: jsonb('turnstile_response').$type<Record<string, unknown>>(),
});

// The singleton's id is fixed, so the row can only ever exist once (rules/database.md).
export const TURNSTILE_CONFIG_ID = '00000000-0000-4000-8000-000000000001';

export const dTurnstileConfig = pgTable('d_turnstile_config', {
  id: uuid('id').primaryKey().default(TURNSTILE_CONFIG_ID),
  method: turnstileMethod('method').notNull().default('POST'),
  url: text('url').notNull().default(''),
  headers: jsonb('headers').$type<TurnstileHeader[]>().notNull().default([]),
  bodyTemplate: text('body_template').notNull().default(''),
  updatedByUserId: uuid('updated_by_user_id').references(() => dUsers.id),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type CheckIn = typeof fCheckIns.$inferSelect;
export type TurnstileConfig = typeof dTurnstileConfig.$inferSelect;
