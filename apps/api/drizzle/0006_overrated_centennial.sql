CREATE TYPE "public"."certificate_decision" AS ENUM('cleared', 'not_cleared');--> statement-breakpoint
CREATE TABLE "f_medical_certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"file_path" text NOT NULL,
	"ai_result" "ai_result" NOT NULL,
	"ai_notes" text NOT NULL,
	"reviewed_by_user_id" uuid,
	"admin_reviewed_at" timestamp with time zone,
	"admin_override_result" "certificate_decision",
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "f_medical_certificates" ADD CONSTRAINT "f_medical_certificates_user_id_d_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."d_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "f_medical_certificates" ADD CONSTRAINT "f_medical_certificates_reviewed_by_user_id_d_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."d_users"("id") ON DELETE no action ON UPDATE no action;