import { aptitudeRouter } from '@api/modules/aptitude/router';
import { certificateRouter } from '@api/modules/aptitude/certificate-router';
import { authRouter } from '@api/modules/auth/router';
import { catalogRouter } from '@api/modules/catalog/router';
import { chatRouter } from '@api/modules/chat/router';
import { onboardingRouter } from '@api/modules/onboarding/router';
import { plansRouter } from '@api/modules/plans/router';
import { reviewsRouter } from '@api/modules/plans/reviews-router';
import { systemRouter } from '@api/modules/system/router';
import { router } from '@api/trpc/procedures';

export const appRouter = router({
  aptitude: aptitudeRouter,
  auth: authRouter,
  catalog: catalogRouter,
  certificates: certificateRouter,
  chat: chatRouter,
  onboarding: onboardingRouter,
  plans: plansRouter,
  reviews: reviewsRouter,
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
