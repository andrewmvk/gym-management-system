import * as service from '@api/modules/checkins/service';
import { assertCan, authedProcedure, router } from '@api/trpc/procedures';
import { z } from 'zod';

const ListRecentInputSchema = z
  .object({ limit: z.number().int().min(1).max(service.MAX_RECENT_LIMIT).optional() })
  .optional();

export const checkinsRouter = router({
  listRecent: authedProcedure.input(ListRecentInputSchema).query(({ ctx, input }) => {
    assertCan(ctx.ability, 'read', 'CheckIn');
    return service.listRecentCheckIns(input?.limit);
  }),

  turnstileSummary: authedProcedure.query(({ ctx }) => {
    assertCan(ctx.ability, 'read', 'CheckIn');
    return service.getTurnstileSummary();
  }),
});
