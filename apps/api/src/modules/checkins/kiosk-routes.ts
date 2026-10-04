import { createHash, timingSafeEqual } from 'node:crypto';
import type { Env } from '@api/config/env';
import { listKioskDevMembers, listKioskEmbeddings } from '@api/modules/checkins/repository';
import { recordCheckIn } from '@api/modules/checkins/service';
import { CheckInInputSchema } from '@cadence/shared/schemas/turnstile';
import express, { type RequestHandler, Router } from 'express';

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

export function createKioskRouter(kioskApiKey: string, nodeEnv: Env['NODE_ENV']) {
  const router = Router();

  // Names are not part of the embeddings payload; this exists only so the dev simulation can pick a member by name.
  if (nodeEnv !== 'production') {
    router.get('/kiosk/dev/members', requireKioskKey(kioskApiKey), async (_req, res) => {
      res.set('Cache-Control', 'private, no-store').json(await listKioskDevMembers());
    });
  }

  router.get('/kiosk/embeddings', requireKioskKey(kioskApiKey), async (_req, res) => {
    res.set('Cache-Control', 'private, no-store').json(await listKioskEmbeddings());
  });

  router.post('/kiosk/checkins', requireKioskKey(kioskApiKey), express.json({ limit: '1kb' }), async (req, res) => {
    const body = CheckInInputSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: 'memberId must be a valid id' });
      return;
    }

    const outcome = await recordCheckIn(body.data.memberId);
    switch (outcome.kind) {
      case 'member_not_found':
        res.status(404).json({ error: 'Member not found' });
        return;
      case 'member_not_cleared':
        res.status(403).json({ error: 'Member is not cleared to train', reason: 'not_cleared' });
        return;
      case 'member_inactive':
        res.status(403).json({ error: 'Membership is inactive', reason: 'membership_inactive' });
        return;
      case 'recorded':
        res.json({ checkInId: outcome.checkInId, turnstileStatus: outcome.turnstileStatus });
    }
  });

  return router;
}
