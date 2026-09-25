CREATE TYPE "public"."policy_effect" AS ENUM('granted', 'denied');--> statement-breakpoint
CREATE TYPE "public"."aptitude_status" AS ENUM('pending', 'cleared', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "d_user_policy" (
	"id" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"operation" text NOT NULL,
	"resource" text NOT NULL,
	"scope" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "f_user_policy_on_user" (
	"user_id" uuid NOT NULL,
	"policy_id" text NOT NULL,
	"effect" "policy_effect" NOT NULL,
	"expires_on" timestamp with time zone,
	CONSTRAINT "f_user_policy_on_user_user_id_policy_id_pk" PRIMARY KEY("user_id","policy_id")
);
--> statement-breakpoint
CREATE TABLE "d_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"password_hash" text,
	"name" text NOT NULL,
	"birthdate" date,
	"reference_photo_path" text,
	"reference_face_embedding" jsonb,
	"aptitude_status" "aptitude_status",
	"membership_status" "membership_status",
	"membership_plan" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "d_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "f_user_policy_on_user" ADD CONSTRAINT "f_user_policy_on_user_user_id_d_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."d_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "f_user_policy_on_user" ADD CONSTRAINT "f_user_policy_on_user_policy_id_d_user_policy_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."d_user_policy"("id") ON DELETE no action ON UPDATE no action;