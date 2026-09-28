import { subject } from '@cadence/shared/auth';
import { ChatSendInputSchema } from '@cadence/shared/schemas/profile-events';
import * as service from '@api/modules/chat/service';
import { assertCan, authedProcedure, router } from '@api/trpc/procedures';

// use_chat (scope self): recording facts from a chat message is a create on the member's own
// ProfileEvent, same policy shape as onboarding's manage_own_onboarding.
export const chatRouter = router({
  send: authedProcedure.input(ChatSendInputSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'create', subject('ProfileEvent', { userId: ctx.user.id }));
    return service.sendMessage(ctx.user.id, input.message);
  }),
});
