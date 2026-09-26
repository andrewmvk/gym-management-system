import { subject } from '@cadence/shared/auth';
import { z } from 'zod';
import * as service from '@api/modules/plans/service';
import { assertCan, authedProcedure, router } from '@api/trpc/procedures';

const GenerateTodayInputSchema = z.object({ confirmOverwrite: z.boolean().default(false) });

export const plansRouter = router({
  // update_own_plans (scope self): generating/regenerating a plan is a write on the member's own
  // TrainingPlan, same policy the member-facing plan screen (P-14) will use for marking exercises.
  generateToday: authedProcedure.input(GenerateTodayInputSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'update', subject('TrainingPlan', { userId: ctx.user.id }));
    return service.generateForDate(ctx.user.id, service.todayDateString(), input.confirmOverwrite);
  }),
});
