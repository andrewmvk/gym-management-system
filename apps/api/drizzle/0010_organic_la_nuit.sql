CREATE TYPE "public"."muscle" AS ENUM('neck', 'chest', 'front-deltoid', 'lateral-deltoid', 'rear-deltoid', 'biceps', 'triceps', 'forearm-flexors', 'forearm-extensors', 'abs', 'abs-lower', 'obliques', 'trapezius', 'rotator-cuff', 'lats', 'lower-back', 'glutes', 'abductors', 'quads', 'quads-outer', 'hamstrings', 'calves');--> statement-breakpoint
CREATE TYPE "public"."muscle_role" AS ENUM('primary', 'secondary');--> statement-breakpoint
ALTER TYPE "public"."profile_event_type" ADD VALUE 'muscle_focus_changed';--> statement-breakpoint
CREATE TABLE "d_exercise_muscles" (
	"exercise_id" uuid NOT NULL,
	"muscle" "muscle" NOT NULL,
	"role" "muscle_role" NOT NULL,
	CONSTRAINT "d_exercise_muscles_exercise_id_muscle_pk" PRIMARY KEY("exercise_id","muscle")
);
--> statement-breakpoint
CREATE TABLE "f_member_muscle_focus" (
	"user_id" uuid NOT NULL,
	"muscle" "muscle" NOT NULL,
	"bias" smallint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "f_member_muscle_focus_user_id_muscle_pk" PRIMARY KEY("user_id","muscle")
);
--> statement-breakpoint
ALTER TABLE "d_exercise_muscles" ADD CONSTRAINT "d_exercise_muscles_exercise_id_d_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."d_exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "f_member_muscle_focus" ADD CONSTRAINT "f_member_muscle_focus_user_id_d_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."d_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "d_exercises" DROP COLUMN "muscle_group";