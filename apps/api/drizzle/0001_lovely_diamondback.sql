CREATE TABLE "d_exercise_equipment" (
	"exercise_id" uuid NOT NULL,
	"equipment_id" uuid NOT NULL,
	CONSTRAINT "d_exercise_equipment_exercise_id_equipment_id_pk" PRIMARY KEY("exercise_id","equipment_id")
);
--> statement-breakpoint
CREATE TABLE "d_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"muscle_group" text NOT NULL,
	"instructions" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "d_gym_equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "d_exercise_equipment" ADD CONSTRAINT "d_exercise_equipment_exercise_id_d_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."d_exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "d_exercise_equipment" ADD CONSTRAINT "d_exercise_equipment_equipment_id_d_gym_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."d_gym_equipment"("id") ON DELETE no action ON UPDATE no action;