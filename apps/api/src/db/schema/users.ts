import { date, jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const aptitudeStatus = pgEnum('aptitude_status', ['pending', 'cleared', 'rejected']);
export const membershipStatus = pgEnum('membership_status', ['active', 'inactive']);

export const dUsers = pgTable('d_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  passwordHash: text('password_hash'),
  name: text('name').notNull(),
  birthdate: date('birthdate'),
  referencePhotoPath: text('reference_photo_path'),
  referenceFaceEmbedding: jsonb('reference_face_embedding').$type<number[]>(),
  aptitudeStatus: aptitudeStatus('aptitude_status'),
  membershipStatus: membershipStatus('membership_status'),
  membershipPlan: text('membership_plan'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type User = typeof dUsers.$inferSelect;
