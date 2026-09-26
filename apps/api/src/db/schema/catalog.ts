import { boolean, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const dExercises = pgTable('d_exercises', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  muscleGroup: text('muscle_group').notNull(),
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

export type Exercise = typeof dExercises.$inferSelect;
export type GymEquipment = typeof dGymEquipment.$inferSelect;
