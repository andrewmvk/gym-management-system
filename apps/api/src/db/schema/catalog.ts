import { MUSCLE_IDS, MUSCLE_ROLES } from '@cadence/shared/schemas/muscles';
import { boolean, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const muscle = pgEnum('muscle', MUSCLE_IDS);
export const muscleRole = pgEnum('muscle_role', MUSCLE_ROLES);

export const dExercises = pgTable('d_exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  instructions: text('instructions').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const dGymEquipment = pgTable('d_gym_equipment', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  isAvailable: boolean('is_available').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const dExerciseEquipment = pgTable(
  'd_exercise_equipment',
  {
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => dExercises.id),
    equipmentId: uuid('equipment_id')
      .notNull()
      .references(() => dGymEquipment.id),
  },
  (table) => [primaryKey({ columns: [table.exerciseId, table.equipmentId] })],
);

export const dExerciseMuscles = pgTable(
  'd_exercise_muscles',
  {
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => dExercises.id),
    muscle: muscle('muscle').notNull(),
    role: muscleRole('role').notNull(),
  },
  (table) => [primaryKey({ columns: [table.exerciseId, table.muscle] })],
);

export type Exercise = typeof dExercises.$inferSelect;
export type ExerciseMuscleRow = typeof dExerciseMuscles.$inferSelect;
export type GymEquipment = typeof dGymEquipment.$inferSelect;
