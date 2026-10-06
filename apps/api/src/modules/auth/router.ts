import { checkEmail, listMembers, loadSession, register, verifyCredentials } from '@api/modules/auth/service';
import { clearSessionCookie, setSessionCookie } from '@api/modules/auth/session';
import { assertCan, authedProcedure, publicProcedure, router } from '@api/trpc/procedures';
import { LoginInputSchema } from '@cadence/shared/schemas/auth';
import { CheckEmailInputSchema, RegisterInputSchema } from '@cadence/shared/schemas/signup';
import { TRPCError } from '@trpc/server';

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

  // Public on purpose: no account exists before registration (FR-9), and the registration page is only
  // restricted to the gym on paper (FR-57).
  checkEmail: publicProcedure.input(CheckEmailInputSchema).mutation(({ input }) => checkEmail(input)),

  // Public on purpose, same reasoning as checkEmail. A refused e-mail or photo is a normal answer (a
  // status), not an error, so the wizard can send the person back to the right step.
  register: publicProcedure.input(RegisterInputSchema).mutation(async ({ ctx, input }) => {
    const result = await register(input);
    if (result.status !== 'registered') return result;

    setSessionCookie(ctx.res, result.user.id);
    ctx.log.info({ userId: result.user.id }, 'member registered');

    const session = await loadSession(result.user.id);
    if (!session)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Registration could not start a session' });
    return { status: 'registered' as const, user: session.user, rules: session.rules, nextStep: 'onboarding' as const };
  }),

  // read_members (scope all): the membership table of the staff app, with no biometric field in the result (FR-40).
  listMembers: authedProcedure.query(({ ctx }) => {
    assertCan(ctx.ability, 'read', 'Member');
    return listMembers();
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
