import { LoginInputSchema } from '@cadence/shared/schemas/auth';
import { TRPCError } from '@trpc/server';
import { clearSessionCookie, setSessionCookie } from '@api/modules/auth/session';
import { loadSession, verifyCredentials } from '@api/modules/auth/service';
import { publicProcedure, router } from '@api/trpc/procedures';

export const authRouter = router({
  login: publicProcedure.input(LoginInputSchema).mutation(async ({ ctx, input }) => {
    const user = await verifyCredentials(input.email, input.password);
    if (!user) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid e-mail or password' });
    }

    setSessionCookie(ctx.res, user.id);
    ctx.log.info({ userId: user.id }, 'user logged in');

    const session = await loadSession(user.id);
    return session && { user: session.user, rules: session.rules };
  }),

  logout: publicProcedure.mutation(({ ctx }) => {
    clearSessionCookie(ctx.res);
    return { ok: true as const };
  }),

  // Public on purpose: "no session" is a normal answer (null) for the route guards, not an error.
  me: publicProcedure.query(({ ctx }) => {
    if (!ctx.session) return null;
    return { user: ctx.session.user, rules: ctx.session.rules };
  }),
});
