import * as service from '@api/modules/chat/service';
import { assertCan, authedProcedure, router } from '@api/trpc/procedures';
import { subject } from '@cadence/shared/auth';
import { ChatSendInputSchema } from '@cadence/shared/schemas/profile-events';
import { z } from 'zod';

const AdjustPlanInputSchema = z.object({
  date: z.iso.date(),
  instruction: z.string().trim().min(1).max(2000),
  confirmOverwrite: z.boolean().default(false),
});

// use_chat (scope self): recording facts from a chat message is a create on the member's own
// ProfileEvent, same policy shape as onboarding's manage_own_onboarding.
export const chatRouter = router({
  send: authedProcedure.input(ChatSendInputSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'create', subject('ProfileEvent', { userId: ctx.user.id }));
    return service.sendMessage(ctx.user.id, input.message);
  }),

  // update_own_plans (scope self): applying a chat-driven adjustment is a write on the member's own
  // TrainingPlan, same policy the member-facing plan screen and generateToday already use.
  adjustPlan: authedProcedure.input(AdjustPlanInputSchema).mutation(({ ctx, input }) => {
    assertCan(ctx.ability, 'update', subject('TrainingPlan', { userId: ctx.user.id }));
    return service.adjustPlan(ctx.user.id, input.date, input.instruction, input.confirmOverwrite);
  }),
});
