import { publicProcedure, router } from '@api/trpc/procedures';

export const systemRouter = router({
  health: publicProcedure.query(() => ({
    status: 'ok' as const,
    uptimeSeconds: Math.round(process.uptime()),
  })),
});
