import * as service from '@api/modules/onboarding/service';
import { assertCan, authedProcedure, router } from '@api/trpc/procedures';
import { subject } from '@cadence/shared/auth';
import { OnboardingSubmitInputSchema } from '@cadence/shared/schemas/onboarding';

// manage_own_onboarding is scope "self" (packages/shared/src/auth/constants/policies.ts): the
// condition binds to ctx.user.id, never a client-supplied id, so a member can only ever act on their
// own submissions.
export const onboardingRouter = router({
  // Yields `saved` as soon as the information is stored, then the exercises of the plan being built, then `done`.
  submit: authedProcedure.input(OnboardingSubmitInputSchema).mutation(async function* ({ ctx, input }) {
    assertCan(ctx.ability, 'manage', subject('Onboarding', { userId: ctx.user.id }));
    yield* service.submitStream(ctx.user.id, input);
  }),

  getStatus: authedProcedure.query(({ ctx }) => {
    assertCan(ctx.ability, 'manage', subject('Onboarding', { userId: ctx.user.id }));
    return service.getStatus(ctx.user.id);
  }),

  listMine: authedProcedure.query(({ ctx }) => {
    assertCan(ctx.ability, 'manage', subject('Onboarding', { userId: ctx.user.id }));
    return service.listMine(ctx.user.id);
  }),
});
