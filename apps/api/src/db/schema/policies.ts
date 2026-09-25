import { POLICY_EFFECTS } from '@cadence/shared/auth';
import { pgEnum, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { dUsers } from '@api/db/schema/users';

export const policyEffect = pgEnum('policy_effect', POLICY_EFFECTS);

// operation/resource/scope stay plain text: their vocabulary is owned by packages/shared/src/auth/types.ts,
// so a new policy recombining existing values is a seed insert, never a migration.
export const dUserPolicy = pgTable('d_user_policy', {
  id: text('id').primaryKey(),
  description: text('description').notNull(),
  operation: text('operation').notNull(),
  resource: text('resource').notNull(),
  scope: text('scope').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const fUserPolicyOnUser = pgTable(
  'f_user_policy_on_user',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => dUsers.id),
    policyId: text('policy_id')
      .notNull()
      .references(() => dUserPolicy.id),
    effect: policyEffect('effect').notNull(),
    expiresOn: timestamp('expires_on', { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.policyId] })],
);
