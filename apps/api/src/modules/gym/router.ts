import * as service from '@api/modules/gym/service';
import { assertCan, authedProcedure, publicProcedure, router } from '@api/trpc/procedures';
import { OpeningHoursSchema } from '@cadence/shared/schemas/gym';

export const gymRouter = router({
  info: publicProcedure.query(() => service.getGymInfo()),

  adminDetail: authedProcedure.query(({ ctx }) => {
    assertCan(ctx.ability, 'read', 'CheckIn');
    return service.getGymAdminDetail();
  }),

  getHours: authedProcedure.query(({ ctx }) => {
    assertCan(ctx.ability, 'manage', 'GymSettings');
    return service.getOpeningHours();
  }),

  updateHours: authedProcedure.input(OpeningHoursSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'manage', 'GymSettings');
    return service.updateOpeningHours(input);
  }),
});
