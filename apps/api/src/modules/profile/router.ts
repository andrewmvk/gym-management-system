import * as service from '@api/modules/profile/service';
import { assertCan, authedProcedure, router } from '@api/trpc/procedures';
import { subject } from '@cadence/shared/auth';
import { ConfirmFactsInputSchema, DismissFactInputSchema } from '@cadence/shared/schemas/coach';
import { z } from 'zod';

const SetResolvedInputSchema = z.object({ id: z.uuid(), resolved: z.boolean() });

// manage_own_profile_events (scope self): the member only ever sees and changes their own remembered facts.
export const profileRouter = router({
  listMine: authedProcedure.query(({ ctx }) => {
    assertCan(ctx.ability, 'read', subject('ProfileEvent', { userId: ctx.user.id }));
    return service.listMine(ctx.user.id);
  }),

  setResolved: authedProcedure.input(SetResolvedInputSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'update', subject('ProfileEvent', { userId: ctx.user.id }));
    return service.setResolved(ctx.user.id, input.id, input.resolved);
  }),

  confirmFacts: authedProcedure.input(ConfirmFactsInputSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'update', subject('ProfileEvent', { userId: ctx.user.id }));
    return service.confirmFacts(ctx.user.id, input.facts);
  }),

  dismissFact: authedProcedure.input(DismissFactInputSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'update', subject('ProfileEvent', { userId: ctx.user.id }));
    return service.dismissFact(ctx.user.id, input.id);
  }),

  listActiveInjuries: authedProcedure.query(({ ctx }) => {
    assertCan(ctx.ability, 'read', subject('ProfileEvent', { userId: ctx.user.id }));
    return service.listActiveInjuries(ctx.user.id);
  }),
});
