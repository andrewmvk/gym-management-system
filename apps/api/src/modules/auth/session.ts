import { env } from '@api/config/env';
import type { CookieOptions, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

export const SESSION_COOKIE = 'cadence_session';
const SESSION_LIFETIME_SECONDS = 7 * 24 * 60 * 60;

const TokenPayloadSchema = z.object({ userId: z.uuid() });

export function signSessionToken(userId: string) {
  return jwt.sign({ userId }, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: SESSION_LIFETIME_SECONDS });
}

export function verifySessionToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    const parsed = TokenPayloadSchema.safeParse(payload);
    return parsed.success ? parsed.data.userId : null;
  } catch {
    return null;
  }
}

// Secure only in production: the local compose demo is plain HTTP, where a Secure cookie is silently dropped.
// sameSite follows it for the same reason: the public deployment (docs/10-deployment.md) puts the frontend and
// the API on two different registrable domains, so the browser only sends the cookie back cross-site when it is
// None, which in turn requires Secure. Local compose keeps frontend and API on the same site, where Lax is both
// enough and necessary, since None without Secure is rejected outright.
function cookieOptions(): CookieOptions {
  const isProduction = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
    path: '/',
  };
}

export function setSessionCookie(res: Response, userId: string) {
  res.cookie(SESSION_COOKIE, signSessionToken(userId), {
    ...cookieOptions(),
    maxAge: SESSION_LIFETIME_SECONDS * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}
