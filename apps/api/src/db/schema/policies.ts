import { dUsers } from '@api/db/schema/users';
import { POLICY_EFFECTS } from '@cadence/shared/auth';
import { pgEnum, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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

// Seeded and read-only: the seed owns the groups and their policy lists, no procedure edits them.
export const dUserPolicyGroup = pgTable('d_user_policy_group', {
  id: text('id').primaryKey(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const dUserPolicyGroupPolicy = pgTable(
  'd_user_policy_group_policy',
  {
    groupId: text('group_id')
      .notNull()
      .references(() => dUserPolicyGroup.id),
    policyId: text('policy_id')
      .notNull()
      .references(() => dUserPolicy.id),
  },
  (table) => [primaryKey({ columns: [table.groupId, table.policyId] })],
);

export const fUserPolicyGroupOnUser = pgTable(
  'f_user_policy_group_on_user',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => dUsers.id),
    groupId: text('group_id')
      .notNull()
      .references(() => dUserPolicyGroup.id),
    expiresOn: timestamp('expires_on', { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.groupId] })],
);

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
