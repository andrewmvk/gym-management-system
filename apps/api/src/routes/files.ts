import { Router, type Response } from 'express';
import { z } from 'zod';
import type {} from '@api/types/express';
import { MIME_TYPE_BY_EXTENSION, resolveUploadPath, UPLOAD_KINDS, type UploadKind } from '@api/lib/uploads';
import { loadSession, type Session } from '@api/modules/auth/service';
import { SESSION_COOKIE, verifySessionToken } from '@api/modules/auth/session';

const STORED_FILENAME = /^[0-9a-f-]{36}\.(jpg|png|pdf)$/;

function canRead(session: Session, ownerId: string, kind: UploadKind) {
  switch (kind) {
    // Reference photos never leave the backend, not even to their owner or an admin.
    case 'reference_photo':
      return false;
    case 'exam':
      return session.user.id === ownerId;
    case 'certificate':
      return session.ability.can('manage', 'MedicalCertificate');
  }
}

function deny(res: Response, status: 401 | 403 | 404) {
  const messages = { 401: 'Sign in to continue', 403: 'You do not have access to this file', 404: 'File not found' };
  res.status(status).json({ error: messages[status] });
}

export function createFilesRouter(uploadsDir: string) {
  const router = Router();

  router.get('/files/*segments', async (req, res) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    const userId = typeof token === 'string' ? verifySessionToken(token) : null;
    const session = userId ? await loadSession(userId) : null;
    if (!session) return deny(res, 401);

    const segments = (req.params as { segments: string[] }).segments;
    const [ownerId, kind, filename] = segments;
    const extension = STORED_FILENAME.exec(filename ?? '')?.[1];
    const isKnownKind = (UPLOAD_KINDS as readonly string[]).includes(kind ?? '');
    if (segments.length !== 3 || !z.uuid().safeParse(ownerId).success || !isKnownKind || !extension) {
      return deny(res, 404);
    }

    if (!canRead(session, ownerId!, kind as UploadKind)) {
      req.log.warn({ userId: session.user.id, kind }, 'file read denied');
      return deny(res, 403);
    }

    const absolutePath = resolveUploadPath(segments.join('/'), uploadsDir);
    res.sendFile(
      absolutePath,
      {
        headers: {
          'Content-Type': MIME_TYPE_BY_EXTENSION[extension]!,
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      },
      (error) => {
        if (error && !res.headersSent) deny(res, 404);
      },
    );
  });

  return router;
}
