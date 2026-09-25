import { authRouter } from '@api/modules/auth/router';
import { systemRouter } from '@api/modules/system/router';
import { router } from '@api/trpc/procedures';

export const appRouter = router({
  auth: authRouter,
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
