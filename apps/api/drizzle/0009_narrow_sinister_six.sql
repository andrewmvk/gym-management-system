CREATE TABLE "d_gym_settings" (
	"id" uuid PRIMARY KEY DEFAULT '00000000-0000-4000-8000-000000000002' NOT NULL,
	"opening_hours" jsonb DEFAULT '{"sunday":null,"monday":{"open":"06:00","close":"22:00"},"tuesday":{"open":"06:00","close":"22:00"},"wednesday":{"open":"06:00","close":"22:00"},"thursday":{"open":"06:00","close":"22:00"},"friday":{"open":"06:00","close":"22:00"},"saturday":{"open":"08:00","close":"14:00"}}'::jsonb NOT NULL
);
