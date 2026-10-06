ALTER TABLE "f_training_plan_exercises" ALTER COLUMN "load" SET DATA TYPE double precision USING substring("load" from '[0-9]+(\.[0-9]+)?')::double precision;
