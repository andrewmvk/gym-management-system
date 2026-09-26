import { aptitudeRouter } from '@api/modules/aptitude/router';
import { authRouter } from '@api/modules/auth/router';
import { catalogRouter } from '@api/modules/catalog/router';
import { onboardingRouter } from '@api/modules/onboarding/router';
import { systemRouter } from '@api/modules/system/router';
import { router } from '@api/trpc/procedures';

export const appRouter = router({
  aptitude: aptitudeRouter,
  auth: authRouter,
  catalog: catalogRouter,
  onboarding: onboardingRouter,
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
