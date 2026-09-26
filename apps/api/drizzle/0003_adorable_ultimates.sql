CREATE TYPE "public"."ai_result" AS ENUM('cleared', 'not_cleared', 'pending_retry');--> statement-breakpoint
CREATE TABLE "f_aptitude_questionnaires" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"answers" jsonb NOT NULL,
	"ai_result" "ai_result" NOT NULL,
	"ai_notes" text NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "f_aptitude_questionnaires_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "f_aptitude_questionnaires" ADD CONSTRAINT "f_aptitude_questionnaires_user_id_d_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."d_users"("id") ON DELETE no action ON UPDATE no action;