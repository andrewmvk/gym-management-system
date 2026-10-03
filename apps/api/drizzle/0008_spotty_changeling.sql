CREATE TABLE "d_user_policy_group" (
	"id" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "d_user_policy_group_policy" (
	"group_id" text NOT NULL,
	"policy_id" text NOT NULL,
	CONSTRAINT "d_user_policy_group_policy_group_id_policy_id_pk" PRIMARY KEY("group_id","policy_id")
);
--> statement-breakpoint
CREATE TABLE "f_user_policy_group_on_user" (
	"user_id" uuid NOT NULL,
	"group_id" text NOT NULL,
	"expires_on" timestamp with time zone,
	CONSTRAINT "f_user_policy_group_on_user_user_id_group_id_pk" PRIMARY KEY("user_id","group_id")
);
--> statement-breakpoint
ALTER TABLE "d_user_policy_group_policy" ADD CONSTRAINT "d_user_policy_group_policy_group_id_d_user_policy_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."d_user_policy_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "d_user_policy_group_policy" ADD CONSTRAINT "d_user_policy_group_policy_policy_id_d_user_policy_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."d_user_policy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "f_user_policy_group_on_user" ADD CONSTRAINT "f_user_policy_group_on_user_user_id_d_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."d_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "f_user_policy_group_on_user" ADD CONSTRAINT "f_user_policy_group_on_user_group_id_d_user_policy_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."d_user_policy_group"("id") ON DELETE no action ON UPDATE no action;