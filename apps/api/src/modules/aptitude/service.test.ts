import { db, pool } from '@api/db/client';
import { dUsers, fConsentEvents } from '@api/db/schema';
import type { ComputeFaceEmbedding } from '@api/lib/face-embedding';
import { insertPendingApplicant } from '@api/modules/aptitude/repository';
import type { EvaluateAptitude } from '@api/modules/aptitude/service';
import { checkEmail, getAptitudeStatus, recheck, submitSignup } from '@api/modules/aptitude/service';
import { resetTestDatabase } from '@api/test/database';
import { QUESTIONNAIRE_V1, type QuestionnaireAnswer, SubmitSignupInputSchema } from '@cadence/shared/schemas/aptitude';
import { count, eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const APPLICANT = {
  name: 'Jamie Rivera',
  phone: '+1 555-0100',
  email: 'jamie.rivera@example.com',
  birthdate: '1995-06-12',
};

const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

async function userCountByEmail(email: string) {
  const [row] = await db.select({ value: count() }).from(dUsers).where(eq(dUsers.email, email));
  return row!.value;
}

const alwaysOk: ComputeFaceEmbedding = async () => ({ ok: true, embedding: Array(128).fill(0.01) });
const alwaysNoFace: ComputeFaceEmbedding = async () => ({ ok: false, reason: 'no_face' });
const alwaysMultipleFaces: ComputeFaceEmbedding = async () => ({ ok: false, reason: 'multiple_faces' });

const allAnswers = (): QuestionnaireAnswer[] => QUESTIONNAIRE_V1.map((q) => ({ questionId: q.id, answer: false }));

const alwaysCleared: EvaluateAptitude = async () => ({
  ok: true,
  data: { verdict: 'cleared', notes: 'Mock: cleared.' },
});
const alwaysNotCleared: EvaluateAptitude = async () => ({
  ok: true,
  data: { verdict: 'not_cleared', notes: 'Mock: certificate required.' },
});
const alwaysUnavailable: EvaluateAptitude = async () => ({ ok: false, reason: 'unavailable' });

const signupInput = (overrides: Partial<typeof APPLICANT & { gender: 'female' | 'male' }> = {}) => ({
  ...APPLICANT,
  ...overrides,
  consented: true as const,
  consentVersion: 'test-1',
  photo: { imageBase64: TINY_JPEG_BASE64, mimeType: 'image/jpeg' },
  answers: allAnswers(),
});

async function submittedApplicant(evaluateAptitude: EvaluateAptitude) {
  const result = await submitSignup(signupInput(), alwaysOk, evaluateAptitude);
  return (result as { userId: string }).userId;
}

describe('aptitude', () => {
  beforeEach(resetTestDatabase);
  afterAll(() => pool.end());

  describe('checkEmail', () => {
    it('reports a new e-mail as available without storing anything', async () => {
      const result = await checkEmail({ email: APPLICANT.email });

      expect(result).toEqual({ status: 'available' });
      expect(await userCountByEmail(APPLICANT.email)).toBe(0);
    });

    it('reports an e-mail whose questionnaire was submitted as resumable', async () => {
      const userId = await submittedApplicant(alwaysUnavailable);

      const result = await checkEmail({ email: APPLICANT.email });

      expect(result).toEqual({ status: 'resumable', userId });
    });

    it('treats a leftover row without a questionnaire as available', async () => {
      await insertPendingApplicant(APPLICANT);

      const result = await checkEmail({ email: APPLICANT.email });

      expect(result).toEqual({ status: 'available' });
    });

    it('blocks a rejected e-mail', async () => {
      const user = await insertPendingApplicant(APPLICANT);
      await db.update(dUsers).set({ aptitudeStatus: 'rejected' }).where(eq(dUsers.id, user.id));

      const result = await checkEmail({ email: APPLICANT.email });

      expect(result).toEqual({ status: 'email_blocked' });
    });

    it('refuses an already registered e-mail', async () => {
      const user = await insertPendingApplicant(APPLICANT);
      await db.update(dUsers).set({ aptitudeStatus: 'cleared', passwordHash: 'hashed' }).where(eq(dUsers.id, user.id));

      const result = await checkEmail({ email: APPLICANT.email });

      expect(result).toEqual({ status: 'already_registered' });
    });
  });

  describe('submitSignup', () => {
    it('stores the applicant, consent, embedding, photo path and questionnaire in one go', async () => {
      const result = await submitSignup(signupInput({ gender: 'female' }), alwaysOk, alwaysCleared);

      expect(result).toMatchObject({ status: 'submitted', outcome: 'cleared' });
      const userId = (result as { userId: string }).userId;
      const [user] = await db.select().from(dUsers).where(eq(dUsers.id, userId));
      expect(user?.gender).toBe('female');
      expect(user?.referenceFaceEmbedding).toHaveLength(128);
      expect(user?.referencePhotoPath).toContain(userId);
      expect(user?.aptitudeStatus).toBe('cleared');
      const consents = await db.select().from(fConsentEvents).where(eq(fConsentEvents.userId, userId));
      expect(consents).toHaveLength(1);
      expect(consents[0]?.consentVersion).toBe('test-1');
    });

    it('refuses an input without explicit biometric consent (RN-12)', () => {
      const parsed = SubmitSignupInputSchema.safeParse({ ...signupInput(), consented: false });

      expect(parsed.success).toBe(false);
    });

    it('never returns the embedding or the photo path', async () => {
      const result = await submitSignup(signupInput(), alwaysOk, alwaysCleared);

      expect(Object.keys(result).sort()).toEqual(['outcome', 'status', 'userId']);
    });

    it('reports certificate_required on a not_cleared verdict without changing aptitude_status', async () => {
      const result = await submitSignup(signupInput(), alwaysOk, alwaysNotCleared);

      expect(result).toMatchObject({ status: 'submitted', outcome: 'certificate_required' });
      const [user] = await db.select().from(dUsers).where(eq(dUsers.email, APPLICANT.email));
      expect(user?.aptitudeStatus).toBe('pending');
    });

    it('stores pending_retry on an AI failure, returning normally with no verdict', async () => {
      const result = await submitSignup(signupInput(), alwaysOk, alwaysUnavailable);

      expect(result).toMatchObject({ status: 'submitted', outcome: 'pending_retry' });
      const userId = (result as { userId: string }).userId;
      expect(await getAptitudeStatus({ userId })).toMatchObject({
        status: 'pending_retry',
        questionnaireResult: 'pending_retry',
      });
    });

    it.each([
      ['no_face', alwaysNoFace],
      ['multiple_faces', alwaysMultipleFaces],
    ] as const)('reports photo_rejected on %s and stores nothing at all', async (reason, compute) => {
      const result = await submitSignup(signupInput(), compute, alwaysCleared);

      expect(result).toEqual({ status: 'photo_rejected', reason });
      expect(await userCountByEmail(APPLICANT.email)).toBe(0);
      const [consents] = await db.select({ value: count() }).from(fConsentEvents);
      expect(consents?.value).toBe(0);
    });

    it('does not evaluate the questionnaire when the photo is rejected', async () => {
      let evaluated = false;
      const spy: EvaluateAptitude = async (answers) => {
        evaluated = true;
        return alwaysCleared(answers);
      };

      await submitSignup(signupInput(), alwaysNoFace, spy);

      expect(evaluated).toBe(false);
    });

    it('blocks a rejected e-mail without creating a duplicate', async () => {
      const user = await insertPendingApplicant(APPLICANT);
      await db.update(dUsers).set({ aptitudeStatus: 'rejected' }).where(eq(dUsers.id, user.id));

      const result = await submitSignup(signupInput(), alwaysOk, alwaysCleared);

      expect(result).toEqual({ status: 'email_blocked' });
      expect(await userCountByEmail(APPLICANT.email)).toBe(1);
    });

    it('refuses an already registered e-mail without changing it', async () => {
      const user = await insertPendingApplicant(APPLICANT);
      await db.update(dUsers).set({ aptitudeStatus: 'cleared', passwordHash: 'hashed' }).where(eq(dUsers.id, user.id));

      const result = await submitSignup(signupInput({ name: 'Someone Else' }), alwaysOk, alwaysCleared);

      expect(result).toEqual({ status: 'already_registered' });
      const [stored] = await db.select().from(dUsers).where(eq(dUsers.email, APPLICANT.email));
      expect(stored?.name).toBe('Jamie Rivera');
    });

    it('never overwrites a submitted questionnaire: a second signup just resumes it', async () => {
      const userId = await submittedApplicant(alwaysNotCleared);

      const result = await submitSignup(signupInput({ name: 'Other Name' }), alwaysOk, alwaysCleared);

      expect(result).toEqual({ status: 'resumed', userId });
      expect(await getAptitudeStatus({ userId })).toMatchObject({ status: 'certificate_required' });
      const [user] = await db.select().from(dUsers).where(eq(dUsers.id, userId));
      expect(user?.name).toBe('Jamie Rivera');
    });

    it('reuses a leftover row without a questionnaire instead of duplicating it', async () => {
      const leftover = await insertPendingApplicant(APPLICANT);

      const result = await submitSignup(signupInput({ name: 'Jamie R. Rivera' }), alwaysOk, alwaysCleared);

      expect(result).toMatchObject({ status: 'submitted', userId: leftover.id });
      expect(await userCountByEmail(APPLICANT.email)).toBe(1);
      const [user] = await db.select().from(dUsers).where(eq(dUsers.id, leftover.id));
      expect(user?.name).toBe('Jamie R. Rivera');
    });
  });

  describe('recheck', () => {
    it('is refused when nothing has been submitted yet', async () => {
      const user = await insertPendingApplicant(APPLICANT);

      const result = await recheck({ userId: user.id }, alwaysCleared);

      expect(result).toEqual({ status: 'not_pending_retry' });
    });

    it('is refused when the latest result is not pending_retry', async () => {
      // not_cleared, not cleared: aptitude_status stays pending, so this exercises recheck's own
      // "latest result" guard rather than the earlier not-a-pending-applicant guard.
      const userId = await submittedApplicant(alwaysNotCleared);

      const result = await recheck({ userId }, alwaysCleared);

      expect(result).toEqual({ status: 'not_pending_retry' });
    });

    it('re-evaluates a pending_retry result and can turn it into a real decision', async () => {
      const userId = await submittedApplicant(alwaysUnavailable);

      const result = await recheck({ userId }, alwaysCleared);

      expect(result).toEqual({ status: 'cleared' });
      const [user] = await db.select().from(dUsers).where(eq(dUsers.id, userId));
      expect(user?.aptitudeStatus).toBe('cleared');
    });

    it('pending_retry never turns into a real decision on its own, without a recheck call', async () => {
      const userId = await submittedApplicant(alwaysUnavailable);

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
      const user = await insertPendingApplicant(APPLICANT);

      const result = await getAptitudeStatus({ userId: user.id });

      expect(result).toEqual({ status: 'not_submitted', questionnaireResult: null, certificateResult: null });
    });

    it('reports unavailable for an unknown userId', async () => {
      const result = await getAptitudeStatus({ userId: '00000000-0000-0000-0000-000000000000' });

      expect(result).toEqual({ status: 'unavailable' });
    });
  });
});
