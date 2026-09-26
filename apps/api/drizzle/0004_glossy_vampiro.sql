CREATE TABLE "f_onboarding_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"medications" jsonb NOT NULL,
	"physical_conditions" jsonb NOT NULL,
	"goals" text NOT NULL,
	"exam_attachment_paths" jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "f_onboarding_submissions" ADD CONSTRAINT "f_onboarding_submissions_user_id_d_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."d_users"("id") ON DELETE no action ON UPDATE no action;