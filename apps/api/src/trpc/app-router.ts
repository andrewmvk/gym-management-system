import { authRouter } from '@api/modules/auth/router';
import { catalogRouter } from '@api/modules/catalog/router';
import { chatRouter } from '@api/modules/chat/router';
import { checkinsRouter } from '@api/modules/checkins/router';
import { focusRouter } from '@api/modules/focus/router';
import { gymRouter } from '@api/modules/gym/router';
import { membersRouter } from '@api/modules/members/router';
import { metricsRouter } from '@api/modules/metrics/router';
import { onboardingRouter } from '@api/modules/onboarding/router';
import { reviewsRouter } from '@api/modules/plans/reviews-router';
import { plansRouter } from '@api/modules/plans/router';
import { policiesRouter } from '@api/modules/policies/router';
import { profileRouter } from '@api/modules/profile/router';
import { systemRouter } from '@api/modules/system/router';
import { turnstileRouter } from '@api/modules/turnstile/router';
import { router } from '@api/trpc/procedures';

export const appRouter = router({
  auth: authRouter,
  catalog: catalogRouter,
  chat: chatRouter,
  checkins: checkinsRouter,
  focus: focusRouter,
  gym: gymRouter,
  members: membersRouter,
  metrics: metricsRouter,
  onboarding: onboardingRouter,
  plans: plansRouter,
  policies: policiesRouter,
  profile: profileRouter,
  reviews: reviewsRouter,
  system: systemRouter,
  turnstile: turnstileRouter,
});

export type AppRouter = typeof appRouter;
