import * as service from '@api/modules/chat/service';
import { assertCan, authedProcedure, router } from '@api/trpc/procedures';
import { subject } from '@cadence/shared/auth';
import { CoachApplyInputSchema, CoachSendInputSchema } from '@cadence/shared/schemas/coach';

// use_chat (scope self): recording facts from a chat message is a create on the member's own
// ProfileEvent, same policy shape as onboarding's manage_own_onboarding.
export const chatRouter = router({
  // Streams the reply text first, then each component (proposal, picker, explainer, facts, ...) as it is ready.
  send: authedProcedure.input(CoachSendInputSchema).mutation(async function* ({ ctx, input }) {
    assertCan(ctx.ability, 'create', subject('ProfileEvent', { userId: ctx.user.id }));
    yield* service.sendMessage(ctx.user.id, input);
  }),

  // update_own_plans (scope self): applying a proposal is a write on the member's own TrainingPlan, same
  // policy the member-facing plan screen and generateToday already use.
  applyDraft: authedProcedure.input(CoachApplyInputSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'update', subject('TrainingPlan', { userId: ctx.user.id }));
    return service.applyDraft(ctx.user.id, input);
  }),
});
