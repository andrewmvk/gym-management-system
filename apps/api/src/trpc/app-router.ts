import { authRouter } from '@api/modules/auth/router';
import { catalogRouter } from '@api/modules/catalog/router';
import { systemRouter } from '@api/modules/system/router';
import { router } from '@api/trpc/procedures';

export const appRouter = router({
  auth: authRouter,
  catalog: catalogRouter,
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
