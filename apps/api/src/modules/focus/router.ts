import * as service from '@api/modules/focus/service';
import { assertCan, authedProcedure, router } from '@api/trpc/procedures';
import { subject } from '@cadence/shared/auth';
import { MemberMuscleFocusSchema } from '@cadence/shared/schemas/muscles';

export const focusRouter = router({
  get: authedProcedure.query(({ ctx }) => {
    assertCan(ctx.ability, 'read', subject('TrainingPlan', { userId: ctx.user.id }));
    return service.getFocus(ctx.user.id);
  }),

  set: authedProcedure.input(MemberMuscleFocusSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'update', subject('TrainingPlan', { userId: ctx.user.id }));
    return service.setFocus(ctx.user.id, input);
  }),
});
