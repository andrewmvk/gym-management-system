import { DEFAULT_OPENING_HOURS, type OpeningHours } from '@cadence/shared/schemas/gym';
import { jsonb, pgTable, uuid } from 'drizzle-orm/pg-core';

// The singleton's id is fixed, so the row can only ever exist once (rules/database.md).
export const GYM_SETTINGS_ID = '00000000-0000-4000-8000-000000000002';

export const dGymSettings = pgTable('d_gym_settings', {
  id: uuid('id').primaryKey().default(GYM_SETTINGS_ID),
  openingHours: jsonb('opening_hours').$type<OpeningHours>().notNull().default(DEFAULT_OPENING_HOURS),
});

export type GymSettings = typeof dGymSettings.$inferSelect;
