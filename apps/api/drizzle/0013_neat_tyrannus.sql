CREATE TYPE "public"."plan_change_kind" AS ENUM('coach', 'member_edit');--> statement-breakpoint
ALTER TYPE "public"."profile_event_type" ADD VALUE 'manual_plan_edit';--> statement-breakpoint
CREATE TABLE "f_plan_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_plan_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "plan_change_kind" NOT NULL,
	"request" text,
	"before" jsonb NOT NULL,
	"after" jsonb NOT NULL,
	"acknowledged_warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "f_profile_events" ADD COLUMN "confirmed_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
UPDATE "f_profile_events" SET "confirmed_at" = "created_at";--> statement-breakpoint
ALTER TABLE "f_plan_changes" ADD CONSTRAINT "f_plan_changes_training_plan_id_f_training_plans_id_fk" FOREIGN KEY ("training_plan_id") REFERENCES "public"."f_training_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "f_plan_changes" ADD CONSTRAINT "f_plan_changes_user_id_d_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."d_users"("id") ON DELETE no action ON UPDATE no action;