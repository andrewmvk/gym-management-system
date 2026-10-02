import * as service from '@api/modules/turnstile/service';
import { assertCan, authedProcedure, router } from '@api/trpc/procedures';
import { UpdateTurnstileConfigInputSchema } from '@cadence/shared/schemas/turnstile';

export const turnstileRouter = router({
  getConfig: authedProcedure.query(({ ctx }) => {
    assertCan(ctx.ability, 'manage', 'TurnstileConfig');
    return service.getConfig();
  }),

  updateConfig: authedProcedure.input(UpdateTurnstileConfigInputSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'manage', 'TurnstileConfig');
    return service.updateConfig({ ...input, updatedByUserId: ctx.user.id });
  }),

  testConnection: authedProcedure.mutation(({ ctx }) => {
    assertCan(ctx.ability, 'manage', 'TurnstileConfig');
    return service.testConnection(ctx.user.id);
  }),
});
