CREATE TYPE "public"."gender" AS ENUM('female', 'male', 'prefer_not_to_say');--> statement-breakpoint
CREATE TABLE "f_consent_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"consent_type" text NOT NULL,
	"consent_version" text NOT NULL,
	"consented_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "d_users" ADD COLUMN "gender" "gender";--> statement-breakpoint
ALTER TABLE "f_consent_events" ADD CONSTRAINT "f_consent_events_user_id_d_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."d_users"("id") ON DELETE no action ON UPDATE no action;