DROP TABLE "f_member_muscle_focus" CASCADE;--> statement-breakpoint
DELETE FROM "f_profile_events" WHERE "event_type" = 'muscle_focus_changed';--> statement-breakpoint
ALTER TABLE "f_profile_events" ALTER COLUMN "event_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."profile_event_type";--> statement-breakpoint
CREATE TYPE "public"."profile_event_type" AS ENUM('injury', 'skipped_exercise', 'medication_change', 'life_event', 'state_update', 'plan_adjustment_request', 'manual_plan_edit');--> statement-breakpoint
ALTER TABLE "f_profile_events" ALTER COLUMN "event_type" SET DATA TYPE "public"."profile_event_type" USING "event_type"::"public"."profile_event_type";