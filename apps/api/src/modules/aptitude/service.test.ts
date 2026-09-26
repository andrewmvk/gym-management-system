import { QUESTIONNAIRE_V1, type QuestionnaireAnswer } from '@cadence/shared/schemas/aptitude';
import { count, eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, pool } from '@api/db/client';
import { dUsers } from '@api/db/schema';
import type { ComputeFaceEmbedding } from '@api/lib/face-embedding';
import type { EvaluateAptitude } from '@api/modules/aptitude/service';
import { getAptitudeStatus, recheck, recordConsent, savePhoto, startSignup, submitQuestionnaire } from '@api/modules/aptitude/service';
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

const allAnswers = (): QuestionnaireAnswer[] => QUESTIONNAIRE_V1.map((q) => ({ questionId: q.id, answer: false }));

const alwaysCleared: EvaluateAptitude = async () => ({ ok: true, data: { verdict: 'cleared', notes: 'Mock: cleared.' } });
const alwaysNotCleared: EvaluateAptitude = async () => ({
  ok: true,
  data: { verdict: 'not_cleared', notes: 'Mock: certificate required.' },
});
const alwaysUnavailable: EvaluateAptitude = async () => ({ ok: false, reason: 'unavailable' });

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
      await recordConsent({ userId, consentVersion: 'test-1' });
      await savePhoto({ userId, imageBase64: TINY_JPEG_BASE64, mimeType: 'image/jpeg' }, alwaysOk);

      const resumed = await startSignup(APPLICANT);

      expect(resumed).toMatchObject({ status: 'resumed', nextStep: 'done' });
    });

    it('persists an optional gender on creation', async () => {
      const created = await startSignup({ ...APPLICANT, gender: 'female' });

      const [user] = await db.select().from(dUsers).where(eq(dUsers.id, (created as { userId: string }).userId));
      expect(user?.gender).toBe('female');
    });

    it('does not clear a previously recorded gender when resuming without resubmitting it', async () => {
      const created = await startSignup({ ...APPLICANT, gender: 'male' });
      const userId = (created as { userId: string }).userId;

      await startSignup({ ...APPLICANT, name: 'Jamie R. Rivera' });

      const [user] = await db.select().from(dUsers).where(eq(dUsers.id, userId));
      expect(user?.gender).toBe('male');
    });
  });

  describe('recordConsent', () => {
    it('records a consent event for a pending applicant', async () => {
      const created = await startSignup(APPLICANT);
      const userId = (created as { userId: string }).userId;

      const result = await recordConsent({ userId, consentVersion: 'test-1' });

      expect(result).toEqual({ status: 'ok' });
    });

    it('refuses a userId that is not a pending applicant', async () => {
      const result = await recordConsent({
        userId: '00000000-0000-0000-0000-000000000000',
        consentVersion: 'test-1',
      });

      expect(result).toEqual({ status: 'unavailable' });
    });
  });

  describe('savePhoto', () => {
    async function pendingApplicant() {
      const result = await startSignup(APPLICANT);
      return (result as { userId: string }).userId;
    }

    async function consentedApplicant() {
      const userId = await pendingApplicant();
      await recordConsent({ userId, consentVersion: 'test-1' });
      return userId;
    }

    it('refuses to process a photo without a prior recorded consent', async () => {
      const userId = await pendingApplicant();

      const result = await savePhoto({ userId, imageBase64: TINY_JPEG_BASE64, mimeType: 'image/jpeg' }, alwaysOk);

      expect(result).toEqual({ status: 'consent_required' });
      const [user] = await db.select().from(dUsers).where(eq(dUsers.id, userId));
      expect(user?.referenceFaceEmbedding).toBeNull();
    });

    it('stores a 128-number embedding and the photo path on success, without returning either', async () => {
      const userId = await consentedApplicant();

      const result = await savePhoto({ userId, imageBase64: TINY_JPEG_BASE64, mimeType: 'image/jpeg' }, alwaysOk);

      expect(result).toEqual({ status: 'ok' });
      expect(Object.keys(result)).toEqual(['status']);
      const [user] = await db.select().from(dUsers).where(eq(dUsers.id, userId));
      expect(user?.referenceFaceEmbedding).toHaveLength(128);
      expect(user?.referencePhotoPath).toContain(userId);
    });

    it('reports photo_rejected on no_face without storing an embedding', async () => {
      const userId = await consentedApplicant();

      const result = await savePhoto({ userId, imageBase64: TINY_JPEG_BASE64, mimeType: 'image/jpeg' }, alwaysNoFace);

      expect(result).toEqual({ status: 'photo_rejected', reason: 'no_face' });
      const [user] = await db.select().from(dUsers).where(eq(dUsers.id, userId));
      expect(user?.referenceFaceEmbedding).toBeNull();
    });

    it('reports photo_rejected on multiple_faces without storing an embedding', async () => {
      const userId = await consentedApplicant();

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

  describe('submitQuestionnaire', () => {
    async function pendingApplicant() {
      const result = await startSignup(APPLICANT);
      return (result as { userId: string }).userId;
    }

    it('clears the applicant and advances aptitude_status on a cleared verdict', async () => {
      const userId = await pendingApplicant();

      const result = await submitQuestionnaire({ userId, answers: allAnswers() }, alwaysCleared);

      expect(result).toEqual({ status: 'cleared' });
      const [user] = await db.select().from(dUsers).where(eq(dUsers.id, userId));
      expect(user?.aptitudeStatus).toBe('cleared');
    });

    it('reports certificate_required on a not_cleared verdict without changing aptitude_status', async () => {
      const userId = await pendingApplicant();

      const result = await submitQuestionnaire({ userId, answers: allAnswers() }, alwaysNotCleared);

      expect(result).toEqual({ status: 'certificate_required' });
      const [user] = await db.select().from(dUsers).where(eq(dUsers.id, userId));
      expect(user?.aptitudeStatus).toBe('pending');
    });

    it('stores pending_retry on an AI failure, returning normally with no verdict', async () => {
      const userId = await pendingApplicant();

      const result = await submitQuestionnaire({ userId, answers: allAnswers() }, alwaysUnavailable);

      expect(result).toEqual({ status: 'pending_retry' });
      const status = await getAptitudeStatus({ userId });
      expect(status).toMatchObject({ status: 'pending_retry', questionnaireResult: 'pending_retry' });
    });

    it('refuses a userId that is not a pending applicant', async () => {
      const result = await submitQuestionnaire(
        { userId: '00000000-0000-0000-0000-000000000000', answers: allAnswers() },
        alwaysCleared,
      );

      expect(result).toEqual({ status: 'unavailable' });
    });

    it('a resubmission overwrites the previous result instead of creating a second row', async () => {
      const userId = await pendingApplicant();
      await submitQuestionnaire({ userId, answers: allAnswers() }, alwaysUnavailable);

      const result = await submitQuestionnaire({ userId, answers: allAnswers() }, alwaysCleared);

      expect(result).toEqual({ status: 'cleared' });
      const status = await getAptitudeStatus({ userId });
      expect(status).toMatchObject({ status: 'cleared', questionnaireResult: 'cleared' });
    });
  });

  describe('recheck', () => {
    async function pendingApplicant() {
      const result = await startSignup(APPLICANT);
      return (result as { userId: string }).userId;
    }

    it('is refused when nothing has been submitted yet', async () => {
      const userId = await pendingApplicant();

      const result = await recheck({ userId }, alwaysCleared);

      expect(result).toEqual({ status: 'not_pending_retry' });
    });

    it('is refused when the latest result is not pending_retry', async () => {
      const userId = await pendingApplicant();
      // not_cleared, not cleared: aptitude_status stays pending, so this exercises recheck's own
      // "latest result" guard rather than the earlier not-a-pending-applicant guard.
      await submitQuestionnaire({ userId, answers: allAnswers() }, alwaysNotCleared);

      const result = await recheck({ userId }, alwaysCleared);

      expect(result).toEqual({ status: 'not_pending_retry' });
    });

    it('re-evaluates a pending_retry result and can turn it into a real decision', async () => {
      const userId = await pendingApplicant();
      await submitQuestionnaire({ userId, answers: allAnswers() }, alwaysUnavailable);

      const result = await recheck({ userId }, alwaysCleared);

      expect(result).toEqual({ status: 'cleared' });
      const [user] = await db.select().from(dUsers).where(eq(dUsers.id, userId));
      expect(user?.aptitudeStatus).toBe('cleared');
    });

    it('pending_retry never turns into a real decision on its own, without a recheck call', async () => {
      const userId = await pendingApplicant();
      await submitQuestionnaire({ userId, answers: allAnswers() }, alwaysUnavailable);

      const status = await getAptitudeStatus({ userId });

      expect(status).toMatchObject({ status: 'pending_retry' });
    });

    it('refuses a userId that is not a pending applicant', async () => {
      const result = await recheck({ userId: '00000000-0000-0000-0000-000000000000' }, alwaysCleared);

      expect(result).toEqual({ status: 'unavailable' });
    });
  });

  describe('getAptitudeStatus', () => {
    it('reports not_submitted before any questionnaire exists', async () => {
      const created = await startSignup(APPLICANT);
      const userId = (created as { userId: string }).userId;

      const result = await getAptitudeStatus({ userId });

      expect(result).toEqual({ status: 'not_submitted', questionnaireResult: null, certificateResult: null });
    });

    it('reports unavailable for an unknown userId', async () => {
      const result = await getAptitudeStatus({ userId: '00000000-0000-0000-0000-000000000000' });

      expect(result).toEqual({ status: 'unavailable' });
    });
  });
});
