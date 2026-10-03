import * as service from '@api/modules/policies/service';
import { assertCan, authedProcedure, router } from '@api/trpc/procedures';
import {
  AssignGroupInputSchema,
  ExtendGroupInputSchema,
  ExtendPolicyInputSchema,
  GrantPolicyInputSchema,
  RevokeGroupInputSchema,
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
    return service.extend(input, ctx.user.id);
  }),

  assignGroup: authedProcedure.input(AssignGroupInputSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'manage', 'UserPolicyAssignment');
    return service.assignGroup(input, ctx.user.id);
  }),

  revokeGroup: authedProcedure.input(RevokeGroupInputSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'manage', 'UserPolicyAssignment');
    return service.revokeGroup(input, ctx.user.id);
  }),

  extendGroup: authedProcedure.input(ExtendGroupInputSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'manage', 'UserPolicyAssignment');
    return service.extendGroup(input, ctx.user.id);
  }),
});
