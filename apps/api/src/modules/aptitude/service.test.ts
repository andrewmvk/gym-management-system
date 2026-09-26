import { count, eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, pool } from '@api/db/client';
import { dUsers } from '@api/db/schema';
import type { ComputeFaceEmbedding } from '@api/lib/face-embedding';
import { savePhoto, startSignup } from '@api/modules/aptitude/service';
import { resetTestDatabase } from '@api/test/database';

const APPLICANT = {
  name: 'Jamie Rivera',
  phone: '+1 555-0100',
  email: 'jamie.rivera@example.com',
  birthdate: '1995-06-12',
};

const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

async function userCountByEmail(email: string) {
  const [row] = await db.select({ value: count() }).from(dUsers).where(eq(dUsers.email, email));
  return row!.value;
}

const alwaysOk: ComputeFaceEmbedding = async () => ({ ok: true, embedding: Array(128).fill(0.01) });
const alwaysNoFace: ComputeFaceEmbedding = async () => ({ ok: false, reason: 'no_face' });
const alwaysMultipleFaces: ComputeFaceEmbedding = async () => ({ ok: false, reason: 'multiple_faces' });

describe('aptitude', () => {
  beforeEach(resetTestDatabase);
  afterAll(() => pool.end());

  describe('startSignup', () => {
    it('creates one row for a new e-mail', async () => {
      const result = await startSignup(APPLICANT);

      expect(result).toMatchObject({ status: 'created', nextStep: 'photo' });
      expect(await userCountByEmail(APPLICANT.email)).toBe(1);
    });

    it('resumes an unfinished signup by e-mail instead of duplicating it', async () => {
      const first = await startSignup(APPLICANT);
      const second = await startSignup({ ...APPLICANT, name: 'Jamie R. Rivera' });

      expect(second).toEqual({ status: 'resumed', userId: (first as { userId: string }).userId, nextStep: 'photo' });
      expect(await userCountByEmail(APPLICANT.email)).toBe(1);
      const [user] = await db.select().from(dUsers).where(eq(dUsers.email, APPLICANT.email));
      expect(user?.name).toBe('Jamie R. Rivera');
    });

    it('blocks a rejected e-mail without creating a duplicate', async () => {
      const created = await startSignup(APPLICANT);
      await db
        .update(dUsers)
        .set({ aptitudeStatus: 'rejected' })
        .where(eq(dUsers.id, (created as { userId: string }).userId));

      const result = await startSignup(APPLICANT);

      expect(result).toEqual({ status: 'email_blocked' });
      expect(await userCountByEmail(APPLICANT.email)).toBe(1);
    });

    it('refuses an already registered e-mail without changing it', async () => {
      const created = await startSignup(APPLICANT);
      await db
        .update(dUsers)
        .set({ aptitudeStatus: 'cleared', passwordHash: 'hashed' })
        .where(eq(dUsers.id, (created as { userId: string }).userId));

      const result = await startSignup({ ...APPLICANT, name: 'Someone Else' });

      expect(result).toEqual({ status: 'already_registered' });
      const [user] = await db.select().from(dUsers).where(eq(dUsers.email, APPLICANT.email));
      expect(user?.name).toBe('Jamie Rivera');
    });

    it('reports nextStep done once the photo step is already complete', async () => {
      const created = await startSignup(APPLICANT);
      const userId = (created as { userId: string }).userId;
      await savePhoto({ userId, imageBase64: TINY_JPEG_BASE64, mimeType: 'image/jpeg' }, alwaysOk);

      const resumed = await startSignup(APPLICANT);

      expect(resumed).toMatchObject({ status: 'resumed', nextStep: 'done' });
    });
  });

  describe('savePhoto', () => {
    async function pendingApplicant() {
      const result = await startSignup(APPLICANT);
      return (result as { userId: string }).userId;
    }

    it('stores a 128-number embedding and the photo path on success, without returning either', async () => {
      const userId = await pendingApplicant();

      const result = await savePhoto({ userId, imageBase64: TINY_JPEG_BASE64, mimeType: 'image/jpeg' }, alwaysOk);

      expect(result).toEqual({ status: 'ok' });
      expect(Object.keys(result)).toEqual(['status']);
      const [user] = await db.select().from(dUsers).where(eq(dUsers.id, userId));
      expect(user?.referenceFaceEmbedding).toHaveLength(128);
      expect(user?.referencePhotoPath).toContain(userId);
    });

    it('reports photo_rejected on no_face without storing an embedding', async () => {
      const userId = await pendingApplicant();

      const result = await savePhoto({ userId, imageBase64: TINY_JPEG_BASE64, mimeType: 'image/jpeg' }, alwaysNoFace);

      expect(result).toEqual({ status: 'photo_rejected', reason: 'no_face' });
      const [user] = await db.select().from(dUsers).where(eq(dUsers.id, userId));
      expect(user?.referenceFaceEmbedding).toBeNull();
    });

    it('reports photo_rejected on multiple_faces without storing an embedding', async () => {
      const userId = await pendingApplicant();

      const result = await savePhoto(
        { userId, imageBase64: TINY_JPEG_BASE64, mimeType: 'image/jpeg' },
        alwaysMultipleFaces,
      );

      expect(result).toEqual({ status: 'photo_rejected', reason: 'multiple_faces' });
      const [user] = await db.select().from(dUsers).where(eq(dUsers.id, userId));
      expect(user?.referenceFaceEmbedding).toBeNull();
    });

    it('refuses a userId that is not an applicant awaiting a photo', async () => {
      const result = await savePhoto(
        { userId: '00000000-0000-0000-0000-000000000000', imageBase64: TINY_JPEG_BASE64, mimeType: 'image/jpeg' },
        alwaysOk,
      );

      expect(result).toEqual({ status: 'photo_rejected', reason: 'unavailable' });
    });
  });
});
