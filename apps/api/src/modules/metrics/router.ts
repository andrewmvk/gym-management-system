import { getMemberMetrics } from '@api/modules/metrics/service';
import { assertCan, authedProcedure, router } from '@api/trpc/procedures';
import { subject } from '@cadence/shared/auth';
import { MetricsRangeInputSchema } from '@cadence/shared/schemas/metrics';

export const metricsRouter = router({
  // read_own_metrics (scope self): the member id always comes from the session, never from the input.
  mine: authedProcedure.input(MetricsRangeInputSchema).query(({ ctx, input }) => {
    assertCan(ctx.ability, 'read', subject('Metrics', { userId: ctx.user.id }));
    return getMemberMetrics(ctx.user.id, input.from, input.to);
  }),
});
