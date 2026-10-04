DROP TABLE "f_aptitude_questionnaires" CASCADE;--> statement-breakpoint
DROP TABLE "f_medical_certificates" CASCADE;--> statement-breakpoint
DELETE FROM "f_consent_events" WHERE "user_id" IN (SELECT "id" FROM "d_users" WHERE "password_hash" IS NULL);--> statement-breakpoint
DELETE FROM "d_users" WHERE "password_hash" IS NULL;--> statement-breakpoint
DELETE FROM "f_onboarding_submissions";--> statement-breakpoint
ALTER TABLE "f_onboarding_submissions" ADD COLUMN "height_cm" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "f_onboarding_submissions" ADD COLUMN "weight_kg" numeric(4, 1) NOT NULL;--> statement-breakpoint
ALTER TABLE "f_onboarding_submissions" ADD COLUMN "exams" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "f_onboarding_submissions" DROP COLUMN "exam_attachment_paths";--> statement-breakpoint
ALTER TABLE "d_users" DROP COLUMN "aptitude_status";--> statement-breakpoint
DROP TYPE "public"."ai_result";--> statement-breakpoint
DROP TYPE "public"."certificate_decision";--> statement-breakpoint
DROP TYPE "public"."aptitude_status";