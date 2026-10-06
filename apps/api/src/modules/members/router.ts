import * as service from '@api/modules/members/service';
import { assertCan, authedProcedure, router } from '@api/trpc/procedures';
import { z } from 'zod';

const GetMemberInputSchema = z.object({ userId: z.uuid() });
const SetMembershipStatusInputSchema = z.object({ userId: z.uuid(), status: z.enum(['active', 'inactive']) });

export const membersRouter = router({
  get: authedProcedure.input(GetMemberInputSchema).query(({ ctx, input }) => {
    assertCan(ctx.ability, 'read', 'Member');
    return service.getMember(input.userId);
  }),

  setMembershipStatus: authedProcedure.input(SetMembershipStatusInputSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'update', 'Member');
    return service.setMembershipStatus(input.userId, input.status);
  }),
});
