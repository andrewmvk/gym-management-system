CREATE TYPE "public"."plan_status" AS ENUM('ai_published', 'trainer_edited');--> statement-breakpoint
CREATE TYPE "public"."profile_event_type" AS ENUM('injury', 'skipped_exercise', 'medication_change', 'life_event', 'state_update', 'plan_adjustment_request');--> statement-breakpoint
CREATE TABLE "f_plan_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_plan_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"note" text NOT NULL,
	"is_edit" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "f_profile_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_type" "profile_event_type" NOT NULL,
	"payload" jsonb NOT NULL,
	"source_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "f_training_plan_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_plan_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"sets" integer NOT NULL,
	"reps" integer NOT NULL,
	"load" text,
	"order_index" integer NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "f_training_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_date" date NOT NULL,
	"ai_generated_at" timestamp with time zone,
	"status" "plan_status" NOT NULL,
	"last_edited_by_user_id" uuid,
	"last_edited_at" timestamp with time zone,
	CONSTRAINT "f_training_plans_user_id_plan_date_unique" UNIQUE("user_id","plan_date")
);
--> statement-breakpoint
ALTER TABLE "f_plan_reviews" ADD CONSTRAINT "f_plan_reviews_training_plan_id_f_training_plans_id_fk" FOREIGN KEY ("training_plan_id") REFERENCES "public"."f_training_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "f_plan_reviews" ADD CONSTRAINT "f_plan_reviews_user_id_d_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."d_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "f_profile_events" ADD CONSTRAINT "f_profile_events_user_id_d_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."d_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "f_training_plan_exercises" ADD CONSTRAINT "f_training_plan_exercises_training_plan_id_f_training_plans_id_fk" FOREIGN KEY ("training_plan_id") REFERENCES "public"."f_training_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "f_training_plan_exercises" ADD CONSTRAINT "f_training_plan_exercises_exercise_id_d_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."d_exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "f_training_plans" ADD CONSTRAINT "f_training_plans_user_id_d_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."d_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "f_training_plans" ADD CONSTRAINT "f_training_plans_last_edited_by_user_id_d_users_id_fk" FOREIGN KEY ("last_edited_by_user_id") REFERENCES "public"."d_users"("id") ON DELETE no action ON UPDATE no action;