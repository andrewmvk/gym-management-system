CREATE TYPE "public"."turnstile_method" AS ENUM('GET', 'POST', 'PUT');--> statement-breakpoint
CREATE TYPE "public"."turnstile_status" AS ENUM('success', 'failed');--> statement-breakpoint
CREATE TABLE "d_turnstile_config" (
	"id" uuid PRIMARY KEY DEFAULT '00000000-0000-4000-8000-000000000001' NOT NULL,
	"method" "turnstile_method" DEFAULT 'POST' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"headers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"body_template" text DEFAULT '' NOT NULL,
	"updated_by_user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "f_check_ins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"checked_in_at" timestamp with time zone DEFAULT now() NOT NULL,
	"turnstile_status" "turnstile_status" NOT NULL,
	"turnstile_response" jsonb
);
--> statement-breakpoint
ALTER TABLE "d_turnstile_config" ADD CONSTRAINT "d_turnstile_config_updated_by_user_id_d_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."d_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "f_check_ins" ADD CONSTRAINT "f_check_ins_user_id_d_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."d_users"("id") ON DELETE no action ON UPDATE no action;