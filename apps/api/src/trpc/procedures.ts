import type { Action, AppAbility, AppSubject } from '@cadence/shared/auth';
import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from '@api/trpc/context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sign in to continue' });
  }
  return next({ ctx: { ...ctx, session: ctx.session, user: ctx.user } });
});

export function assertCan(ability: AppAbility, action: Action, subject: AppSubject) {
  if (ability.cannot(action, subject)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to do this' });
  }
}
