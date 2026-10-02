import { createHash, timingSafeEqual } from 'node:crypto';
import { db } from '@api/db/client';
import { dUsers } from '@api/db/schema';
import { and, eq, isNotNull } from 'drizzle-orm';
import { type RequestHandler, Router } from 'express';

export const KIOSK_KEY_HEADER = 'x-kiosk-key';

// Hashing first gives timingSafeEqual equal-length buffers, so the key length is not leaked either.
function keysMatch(provided: string, expected: string) {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(provided), digest(expected));
}

export function requireKioskKey(expectedKey: string): RequestHandler {
  return (req, res, next) => {
    const provided = req.header(KIOSK_KEY_HEADER);
    if (typeof provided !== 'string' || !keysMatch(provided, expectedKey)) {
      req.log.warn('kiosk request denied');
      res.status(401).json({ error: 'Invalid kiosk key' });
      return;
    }
    next();
  };
}

export function createKioskRouter(kioskApiKey: string) {
  const router = Router();

  router.get('/kiosk/embeddings', requireKioskKey(kioskApiKey), async (_req, res) => {
    const rows = await db
      .select({ memberId: dUsers.id, embedding: dUsers.referenceFaceEmbedding })
      .from(dUsers)
      .where(
        and(
          eq(dUsers.aptitudeStatus, 'cleared'),
          isNotNull(dUsers.passwordHash),
          isNotNull(dUsers.referenceFaceEmbedding),
        ),
      );

    res.set('Cache-Control', 'private, no-store').json(rows);
  });

  return router;
}
