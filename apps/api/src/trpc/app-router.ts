import { certificateRouter } from '@api/modules/aptitude/certificate-router';
import { aptitudeRouter } from '@api/modules/aptitude/router';
import { authRouter } from '@api/modules/auth/router';
import { catalogRouter } from '@api/modules/catalog/router';
import { chatRouter } from '@api/modules/chat/router';
import { focusRouter } from '@api/modules/focus/router';
import { gymRouter } from '@api/modules/gym/router';
import { metricsRouter } from '@api/modules/metrics/router';
import { onboardingRouter } from '@api/modules/onboarding/router';
import { reviewsRouter } from '@api/modules/plans/reviews-router';
import { plansRouter } from '@api/modules/plans/router';
import { policiesRouter } from '@api/modules/policies/router';
import { systemRouter } from '@api/modules/system/router';
import { turnstileRouter } from '@api/modules/turnstile/router';
import { router } from '@api/trpc/procedures';

export const appRouter = router({
  aptitude: aptitudeRouter,
  auth: authRouter,
  catalog: catalogRouter,
  certificates: certificateRouter,
  chat: chatRouter,
  focus: focusRouter,
  gym: gymRouter,
  metrics: metricsRouter,
  onboarding: onboardingRouter,
  plans: plansRouter,
  policies: policiesRouter,
  reviews: reviewsRouter,
  system: systemRouter,
  turnstile: turnstileRouter,
});

export type AppRouter = typeof appRouter;
