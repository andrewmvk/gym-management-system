import * as service from '@api/modules/gym/service';
import { assertCan, authedProcedure, publicProcedure, router } from '@api/trpc/procedures';

export const gymRouter = router({
  info: publicProcedure.query(() => service.getGymInfo()),

  adminDetail: authedProcedure.query(({ ctx }) => {
    assertCan(ctx.ability, 'read', 'CheckIn');
    return service.getGymAdminDetail();
  }),
});
