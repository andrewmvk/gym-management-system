import { dExercises } from '@api/db/schema/catalog';
import { dUsers } from '@api/db/schema/users';
import {
  boolean,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const planStatus = pgEnum('plan_status', ['ai_published', 'trainer_edited']);

export const profileEventType = pgEnum('profile_event_type', [
  'injury',
  'skipped_exercise',
  'medication_change',
  'life_event',
  'state_update',
  'plan_adjustment_request',
  'manual_plan_edit',
]);

export const planChangeKind = pgEnum('plan_change_kind', ['coach', 'member_edit']);

// One row per member per date (FR-15/FR-18). Regenerating replaces this row in place rather than
// appending a new one for the same date - see plans/repository.ts.
export const fTrainingPlans = pgTable(
  'f_training_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => dUsers.id),
    planDate: date('plan_date').notNull(),
    aiGeneratedAt: timestamp('ai_generated_at', { withTimezone: true }),
    status: planStatus('status').notNull(),
    lastEditedByUserId: uuid('last_edited_by_user_id').references(() => dUsers.id),
    lastEditedAt: timestamp('last_edited_at', { withTimezone: true }),
  },
  (table) => [unique().on(table.userId, table.planDate)],
);

export type TrainingPlan = typeof fTrainingPlans.$inferSelect;

// Stays empty until P-15 (trainer review): created now because it's part of the same data model group
// docs/05-data-model.md describes together with f_training_plans.
export const fPlanReviews = pgTable('f_plan_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  trainingPlanId: uuid('training_plan_id')
    .notNull()
    .references(() => fTrainingPlans.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => dUsers.id),
  note: text('note').notNull(),
  isEdit: boolean('is_edit').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PlanReview = typeof fPlanReviews.$inferSelect;

export const fTrainingPlanExercises = pgTable('f_training_plan_exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  trainingPlanId: uuid('training_plan_id')
    .notNull()
    .references(() => fTrainingPlans.id),
  exerciseId: uuid('exercise_id')
    .notNull()
    .references(() => dExercises.id),
  sets: integer('sets').notNull(),
  reps: integer('reps').notNull(),
  // The weight in kilograms; null for an exercise done without added weight.
  load: doublePrecision('load'),
  orderIndex: integer('order_index').notNull(),
  completed: boolean('completed').notNull().default(false),
  notes: text('notes'),
});

export type TrainingPlanExercise = typeof fTrainingPlanExercises.$inferSelect;

// The durable "AI memory" extracted from chat (FR-27) - stays empty until P-16. Created now so plan
// generation's context assembly has a real (if always-empty-for-now) table to read.
export const fProfileEvents = pgTable('f_profile_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => dUsers.id),
  eventType: profileEventType('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  sourceMessage: text('source_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // A fact the coach extracted from chat waits here until the member confirms it; a pending fact never
  // reaches a prompt. Facts written by the system itself are confirmed on insert.
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }).defaultNow(),
  // Set when the member says the fact no longer applies (an injury that healed) or dismisses a pending
  // one; resolved events stay as history but never reach a prompt.
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});

export type ProfileEvent = typeof fProfileEvents.$inferSelect;

// What changed on a plan through the coach or the member's own number edits, kept for trainer review.
// before and after are exercise lists as the member saw them; acknowledgedWarnings holds the safety
// warnings the member accepted before applying.
export const fPlanChanges = pgTable('f_plan_changes', {
  id: uuid('id').primaryKey().defaultRandom(),
  trainingPlanId: uuid('training_plan_id')
    .notNull()
    .references(() => fTrainingPlans.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => dUsers.id),
  kind: planChangeKind('kind').notNull(),
  request: text('request'),
  before: jsonb('before').notNull(),
  after: jsonb('after').notNull(),
  acknowledgedWarnings: jsonb('acknowledged_warnings').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PlanChange = typeof fPlanChanges.$inferSelect;
