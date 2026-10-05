import * as service from '@api/modules/plans/reviews-service';
import { assertCan, authedProcedure, router } from '@api/trpc/procedures';
import { subject } from '@cadence/shared/auth';
import { WeightKgSchema } from '@cadence/shared/schemas/coach';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

// CASL matches a bare subject-type check ("read", "TrainingPlan") against ANY rule for that type,
// conditions included - it can't rule out a conditioned (self-scope) rule without a real object to test
// it against, so it optimistically lets it through. Passing an empty-but-typed object here gives CASL
// something to test read_own_plans's { userId } condition against, which correctly fails to match (no
// userId field present) - only an unconditioned read_all_plans grant passes. Verified empirically in
// reviews-router.test.ts ("refuses a member").
const ANY_TRAINING_PLAN = subject('TrainingPlan', {});

const GetPlanInputSchema = z.object({ planId: z.uuid() });
const AddNoteInputSchema = z.object({ planId: z.uuid(), note: z.string().trim().min(1) });

const PlanExerciseInputSchema = z.object({
  exerciseId: z.uuid(),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  load: WeightKgSchema.optional(),
  notes: z.string().trim().optional(),
});
const EditPlanInputSchema = z.object({
  planId: z.uuid(),
  exercises: z.array(PlanExerciseInputSchema),
  note: z.string().trim().optional(),
});

// Registered as the top-level "reviews" router: the procedure names read naturally as
// reviews.queue/getPlan/addNote/editPlan, not nested under plans.
export const reviewsRouter = router({
  // read_all_plans (scope all) only: see ANY_TRAINING_PLAN above for why a bare type check would
  // wrongly admit a member's self-scoped read_own_plans grant too.
  queue: authedProcedure.query(({ ctx }) => {
    assertCan(ctx.ability, 'read', ANY_TRAINING_PLAN);
    return service.listQueue();
  }),

  overview: authedProcedure.query(({ ctx }) => {
    assertCan(ctx.ability, 'read', ANY_TRAINING_PLAN);
    return service.getOverview();
  }),

  getPlan: authedProcedure.input(GetPlanInputSchema).query(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'read', ANY_TRAINING_PLAN);
    const result = await service.getPlan(input.planId);
    if (!result) throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan not found' });
    return result;
  }),

  // manage_plan_reviews: only a trainer holds this (not the seeded admin) - reviewing/editing plans is
  // a trainer responsibility, matching packages/shared/src/auth/constants/policies.ts's TRAINER_POLICY_IDS.
  addNote: authedProcedure.input(AddNoteInputSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'manage', 'PlanReview');
    const result = await service.addNote(input.planId, ctx.user.id, input.note);
    if (!result) throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan not found' });
    return result;
  }),

  // Changing a plan needs the plan-editing policy as well as the review one; a note needs only the review one.
  editPlan: authedProcedure.input(EditPlanInputSchema).mutation(async ({ ctx, input }) => {
    assertCan(ctx.ability, 'manage', 'PlanReview');
    assertCan(ctx.ability, 'update', ANY_TRAINING_PLAN);
    const result = await service.editPlan(input.planId, ctx.user.id, input.exercises, input.note);
    if (!result) throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan not found' });
    return result;
  }),
});
