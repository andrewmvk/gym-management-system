import { db, pool } from '@api/db/client';
import { dUsers } from '@api/db/schema';
import { SEED_ADMIN_EMAIL, seedBase } from '@api/db/seed';
import type { ComputeFaceEmbedding } from '@api/lib/face-embedding';
import {
  listQueue,
  reviewCertificate,
  UNINSPECTED_CERTIFICATE_NOTES,
  uploadCertificate,
} from '@api/modules/aptitude/certificate-service';
import { insertPendingApplicant } from '@api/modules/aptitude/repository';
import type { EvaluateAptitude } from '@api/modules/aptitude/service';
import { submitSignup } from '@api/modules/aptitude/service';
import { resetTestDatabase } from '@api/test/database';
import { QUESTIONNAIRE_V1, type QuestionnaireAnswer } from '@cadence/shared/schemas/aptitude';
import type { CertificateUploadInput } from '@cadence/shared/schemas/certificates';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const APPLICANT = {
  name: 'Morgan Reyes',
  phone: '+1 555-0199',
  email: 'morgan.reyes@example.com',
  birthdate: '1990-03-20',
};

const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

const allAnswers = (): QuestionnaireAnswer[] => QUESTIONNAIRE_V1.map((q) => ({ questionId: q.id, answer: false }));

const alwaysNotCleared: EvaluateAptitude = async () => ({
  ok: true,
  data: { verdict: 'not_cleared', notes: 'needs certificate' },
});
const alwaysCleared: EvaluateAptitude = async () => ({ ok: true, data: { verdict: 'cleared', notes: 'ok' } });
const alwaysPendingAptitude: EvaluateAptitude = async () => ({ ok: false, reason: 'unavailable' });

const alwaysEmbedding: ComputeFaceEmbedding = async () => ({ ok: true, embedding: Array(128).fill(0.01) });

const signupInput = () => ({
  ...APPLICANT,
  consented: true as const,
  photo: { imageBase64: TINY_JPEG_BASE64, mimeType: 'image/jpeg' },
  answers: allAnswers(),
});

// An applicant row that never submitted a questionnaire.
async function applicantId() {
  const user = await insertPendingApplicant(APPLICANT);
  return user.id;
}

async function submittedApplicant(evaluateAptitude: EvaluateAptitude) {
  const result = await submitSignup(signupInput(), alwaysEmbedding, evaluateAptitude);
  return (result as { userId: string }).userId;
}

function notClearedApplicant() {
  return submittedApplicant(alwaysNotCleared);
}

function uploadInput(userId: string): CertificateUploadInput {
  return { userId, filename: 'certificate.jpg', mimeType: 'image/jpeg', base64: TINY_JPEG_BASE64 };
}

async function aptitudeStatusOf(userId: string) {
  const [user] = await db.select().from(dUsers).where(eq(dUsers.id, userId));
  return user?.aptitudeStatus;
}

async function reviewerId() {
  const [admin] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_ADMIN_EMAIL));
  return admin!.id;
}

describe('certificate-service', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });
  afterAll(() => pool.end());

  describe('uploadCertificate', () => {
    it('refuses before any questionnaire has been submitted', async () => {
      const userId = await applicantId();

      const result = await uploadCertificate(uploadInput(userId));

      expect(result).toEqual({ status: 'unavailable' });
    });

    it('refuses when the questionnaire already cleared the applicant', async () => {
      const userId = await submittedApplicant(alwaysCleared);

      const result = await uploadCertificate(uploadInput(userId));

      expect(result).toEqual({ status: 'unavailable' });
    });

    it('succeeds after a not_cleared questionnaire and enters the AI result, still pending', async () => {
      const userId = await notClearedApplicant();

      const result = await uploadCertificate(uploadInput(userId));

      expect(result).toEqual({ status: 'ok' });
      expect(await aptitudeStatusOf(userId)).toBe('pending');
    });

    it('succeeds after a persistent pending_retry questionnaire', async () => {
      const userId = await submittedApplicant(alwaysPendingAptitude);

      const result = await uploadCertificate(uploadInput(userId));

      expect(result).toEqual({ status: 'ok' });
    });

    it('stores pending_retry with an honest note, never a not_cleared the AI could not have decided', async () => {
      const userId = await notClearedApplicant();

      const result = await uploadCertificate(uploadInput(userId));

      expect(result).toEqual({ status: 'ok' });
      const [queued] = await listQueue();
      expect(queued).toMatchObject({ aiResult: 'pending_retry', aiNotes: UNINSPECTED_CERTIFICATE_NOTES });
      expect(await aptitudeStatusOf(userId)).toBe('pending');
    });

    it('refuses an unknown userId', async () => {
      const result = await uploadCertificate(uploadInput('00000000-0000-0000-0000-000000000000'));

      expect(result).toEqual({ status: 'unavailable' });
    });
  });

  describe('listQueue', () => {
    it('includes every certificate regardless of its AI result', async () => {
      const userId = await notClearedApplicant();
      await uploadCertificate(uploadInput(userId));

      const queue = await listQueue();

      expect(queue).toHaveLength(1);
      expect(queue[0]).toMatchObject({
        applicantName: APPLICANT.name,
        applicantEmail: APPLICANT.email,
        aiResult: 'pending_retry',
        reviewedByUserId: null,
        reviewedByName: null,
        adminReviewedAt: null,
      });
    });

    it('shows what the questionnaire concluded and why, so the admin sees why a certificate was asked for', async () => {
      const userId = await notClearedApplicant();
      await uploadCertificate(uploadInput(userId));

      const [entry] = await listQueue();

      expect(entry).toMatchObject({ questionnaireResult: 'not_cleared', questionnaireNotes: 'needs certificate' });
    });

    it('names the reviewing admin and the decision time once reviewed', async () => {
      const userId = await notClearedApplicant();
      await uploadCertificate(uploadInput(userId));
      const [certificate] = await listQueue();
      await reviewCertificate(await reviewerId(), { certificateId: certificate!.id, result: 'cleared' });

      const [entry] = await listQueue();

      expect(entry).toMatchObject({
        reviewedByUserId: await reviewerId(),
        reviewedByName: 'Demo Admin',
        adminOverrideResult: 'cleared',
      });
      expect(entry?.adminReviewedAt).toBeInstanceOf(Date);
    });
  });

  describe('reviewCertificate', () => {
    it('returns not_found for an unknown certificate', async () => {
      const result = await reviewCertificate('00000000-0000-0000-0000-000000000000', {
        certificateId: '00000000-0000-0000-0000-000000000000',
        result: 'confirm',
      });

      expect(result).toEqual({ status: 'not_found' });
    });

    it('refuses to confirm a certificate the AI could not inspect, and leaves the applicant untouched', async () => {
      const userId = await notClearedApplicant();
      await uploadCertificate(uploadInput(userId));
      const [certificate] = await listQueue();

      const result = await reviewCertificate(await reviewerId(), { certificateId: certificate!.id, result: 'confirm' });

      expect(result).toEqual({ status: 'no_decision_to_confirm' });
      expect(await aptitudeStatusOf(userId)).toBe('pending');
    });

    it('an explicit not_cleared from the admin rejects the applicant', async () => {
      const userId = await notClearedApplicant();
      await uploadCertificate(uploadInput(userId));
      const [certificate] = await listQueue();

      const result = await reviewCertificate(await reviewerId(), {
        certificateId: certificate!.id,
        result: 'not_cleared',
      });

      expect(result).toMatchObject({ status: 'ok', aptitudeStatus: 'rejected' });
      expect(await aptitudeStatusOf(userId)).toBe('rejected');
    });

    it('an explicit cleared from the admin clears the applicant', async () => {
      const userId = await notClearedApplicant();
      await uploadCertificate(uploadInput(userId));
      const [certificate] = await listQueue();

      const result = await reviewCertificate(await reviewerId(), { certificateId: certificate!.id, result: 'cleared' });

      expect(result).toMatchObject({ status: 'ok', aptitudeStatus: 'cleared' });
      expect(await aptitudeStatusOf(userId)).toBe('cleared');
    });

    it('never changes aptitude_status once the applicant already has a password', async () => {
      const userId = await notClearedApplicant();
      await uploadCertificate(uploadInput(userId));
      const [certificate] = await listQueue();
      await db.update(dUsers).set({ passwordHash: 'already-activated' }).where(eq(dUsers.id, userId));

      const result = await reviewCertificate(await reviewerId(), { certificateId: certificate!.id, result: 'cleared' });

      expect(result).toMatchObject({ status: 'ok', aptitudeStatus: null });
      expect(await aptitudeStatusOf(userId)).toBe('pending');
    });

    it('a rejected applicant cannot start a new signup with that e-mail', async () => {
      const userId = await notClearedApplicant();
      await uploadCertificate(uploadInput(userId));
      const [certificate] = await listQueue();
      await reviewCertificate(await reviewerId(), { certificateId: certificate!.id, result: 'not_cleared' });

      const result = await submitSignup(signupInput(), alwaysEmbedding, alwaysCleared);

      expect(result).toEqual({ status: 'email_blocked' });
    });
  });
});
