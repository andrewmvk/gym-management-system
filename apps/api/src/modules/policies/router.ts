import * as service from '@api/modules/policies/service';
import { assertCan, authedProcedure, router } from '@api/trpc/procedures';
import {
  ExtendPolicyInputSchema,
  GrantPolicyInputSchema,
  RevokePolicyInputSchema,
} from '@cadence/shared/schemas/policies';

export const policiesRouter = router({
  list: authedProcedure.query(({ ctx }) => {
    assertCan(ctx.ability, 'manage', 'UserPolicyAssignment');
    return service.list();
  }),

  grant: authedProcedure.input(GrantPolicyInputSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'manage', 'UserPolicyAssignment');
    return service.grant(input, ctx.user.id);
  }),

  revoke: authedProcedure.input(RevokePolicyInputSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'manage', 'UserPolicyAssignment');
    return service.revoke(input, ctx.user.id);
  }),

  extend: authedProcedure.input(ExtendPolicyInputSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'manage', 'UserPolicyAssignment');
    return service.extend(input);
  }),
});
