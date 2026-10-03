import { dExercises, muscle } from '@api/db/schema/catalog';
import { dUsers } from '@api/db/schema/users';
import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
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
  'muscle_focus_changed',
]);

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
  load: text('load'),
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
});

export type ProfileEvent = typeof fProfileEvents.$inferSelect;

// The member's current muscle emphasis (-2 much less to +2 much more). A missing row means normal, so
// resetting a muscle deletes its row. Each change is also appended to f_profile_events so the history
// the AI reasons from stays complete.
export const fMemberMuscleFocus = pgTable(
  'f_member_muscle_focus',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => dUsers.id),
    muscle: muscle('muscle').notNull(),
    bias: smallint('bias').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.muscle] })],
);

export type MemberMuscleFocusRow = typeof fMemberMuscleFocus.$inferSelect;
