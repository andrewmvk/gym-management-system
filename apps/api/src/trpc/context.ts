import { createAppAbility } from '@cadence/shared/auth';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import type {} from '@api/types/express';
import { loadSession } from '@api/modules/auth/service';
import { SESSION_COOKIE, verifySessionToken } from '@api/modules/auth/session';

export async function createContext({ req, res }: CreateExpressContextOptions) {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  const userId = typeof token === 'string' ? verifySessionToken(token) : null;
  const session = userId ? await loadSession(userId) : null;

  return {
    req,
    res,
    log: session ? req.log.child({ userId: session.user.id }) : req.log,
    session,
    user: session?.user ?? null,
    ability: session?.ability ?? createAppAbility(),
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
