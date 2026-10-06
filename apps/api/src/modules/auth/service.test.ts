import { db, pool } from '@api/db/client';
import { dUsers, fConsentEvents, fUserPolicyGroupOnUser, fUserPolicyOnUser } from '@api/db/schema';
import { seedBase } from '@api/db/seed';
import type { ComputeFaceEmbedding } from '@api/lib/face-embedding';
import { findActiveGrants } from '@api/modules/auth/repository';
import { checkEmail, register } from '@api/modules/auth/service';
import { resetTestDatabase } from '@api/test/database';
import { MEMBER_GROUP, MEMBER_POLICY_IDS } from '@cadence/shared/auth';
import { RegisterInputSchema } from '@cadence/shared/schemas/signup';
import bcrypt from 'bcryptjs';
import { count, eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const PERSON = {
  name: 'Jamie Rivera',
  phone: '+1 555-0100',
  email: 'jamie.rivera@example.com',
  birthdate: '1995-06-12',
};
const PASSWORD = 'a-strong-password';

const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

const alwaysOk: ComputeFaceEmbedding = async () => ({ ok: true, embedding: Array(128).fill(0.01) });
const alwaysNoFace: ComputeFaceEmbedding = async () => ({ ok: false, reason: 'no_face' });
const alwaysMultipleFaces: ComputeFaceEmbedding = async () => ({ ok: false, reason: 'multiple_faces' });

const registerInput = (overrides: Partial<typeof PERSON & { gender: 'female' | 'male' }> = {}) => ({
  ...PERSON,
  ...overrides,
  consented: true as const,
  consentVersion: 'test-1',
  photo: { imageBase64: TINY_JPEG_BASE64, mimeType: 'image/jpeg' },
  password: PASSWORD,
});

async function userCountByEmail(email: string) {
  const [row] = await db.select({ value: count() }).from(dUsers).where(eq(dUsers.email, email));
  return row!.value;
}

async function consentCount() {
  const [row] = await db.select({ value: count() }).from(fConsentEvents);
  return row!.value;
}

async function membershipCount() {
  const [row] = await db.select({ value: count() }).from(fUserPolicyGroupOnUser);
  return row!.value;
}

describe('registration', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });
  afterAll(() => pool.end());

  describe('checkEmail', () => {
    it('reports a new e-mail as available without storing anything', async () => {
      const result = await checkEmail({ email: PERSON.email });

      expect(result).toEqual({ status: 'available' });
      expect(await userCountByEmail(PERSON.email)).toBe(0);
    });

    it('refuses an already registered e-mail', async () => {
      await register(registerInput(), alwaysOk);

      expect(await checkEmail({ email: PERSON.email })).toEqual({ status: 'already_registered' });
    });
  });

  describe('register', () => {
    it('creates the account in one go: password hash, member group, active membership, consent, embedding and photo', async () => {
      const result = await register(registerInput({ gender: 'female' }), alwaysOk);

      expect(result.status).toBe('registered');
      const [user] = await db.select().from(dUsers).where(eq(dUsers.email, PERSON.email));
      expect(user).toMatchObject({
        name: PERSON.name,
        phone: PERSON.phone,
        birthdate: PERSON.birthdate,
        gender: 'female',
        membershipStatus: 'active',
      });
      expect(user?.membershipPlan).toBeTruthy();
      expect(await bcrypt.compare(PASSWORD, user!.passwordHash!)).toBe(true);
      expect(user?.referenceFaceEmbedding).toHaveLength(128);
      expect(user?.referencePhotoPath).toContain(user!.id);

      const memberships = await db
        .select({ groupId: fUserPolicyGroupOnUser.groupId, expiresOn: fUserPolicyGroupOnUser.expiresOn })
        .from(fUserPolicyGroupOnUser)
        .where(eq(fUserPolicyGroupOnUser.userId, user!.id));
      expect(memberships).toEqual([{ groupId: MEMBER_GROUP, expiresOn: null }]);
      expect(await db.select().from(fUserPolicyOnUser).where(eq(fUserPolicyOnUser.userId, user!.id))).toHaveLength(0);
      expect(await findActiveGrants(user!.id, new Date())).toHaveLength(MEMBER_POLICY_IDS.length);

      const consents = await db.select().from(fConsentEvents).where(eq(fConsentEvents.userId, user!.id));
      expect(consents).toHaveLength(1);
      expect(consents[0]?.consentVersion).toBe('test-1');
    });

    it('returns the user without ever exposing the embedding or the photo path', async () => {
      const result = await register(registerInput(), alwaysOk);

      expect(Object.keys(result).sort()).toEqual(['status', 'user']);
    });

    it('refuses an input without explicit biometric consent (RN-12)', () => {
      expect(RegisterInputSchema.safeParse({ ...registerInput(), consented: false }).success).toBe(false);
      expect(RegisterInputSchema.safeParse({ ...registerInput(), consented: undefined }).success).toBe(false);
    });

    it('refuses a password shorter than 8 characters', () => {
      expect(RegisterInputSchema.safeParse({ ...registerInput(), password: 'short' }).success).toBe(false);
      expect(RegisterInputSchema.safeParse({ ...registerInput(), password: '12345678' }).success).toBe(true);
    });

    it.each([
      ['no_face', alwaysNoFace],
      ['multiple_faces', alwaysMultipleFaces],
    ] as const)(
      'reports photo_rejected on %s and rolls back the account and the consent together (RN-12)',
      async (reason, compute) => {
        const membershipsBefore = await membershipCount();

        const result = await register(registerInput(), compute);

        expect(result).toEqual({ status: 'photo_rejected', reason });
        expect(await userCountByEmail(PERSON.email)).toBe(0);
        expect(await consentCount()).toBe(0);
        expect(await membershipCount()).toBe(membershipsBefore);
      },
    );

    it('lets the person register again with another photo after a rejected one', async () => {
      await register(registerInput(), alwaysNoFace);

      const result = await register(registerInput(), alwaysOk);

      expect(result.status).toBe('registered');
      expect(await userCountByEmail(PERSON.email)).toBe(1);
    });

    it('refuses an already registered e-mail without changing the account', async () => {
      await register(registerInput(), alwaysOk);

      const result = await register(registerInput({ name: 'Someone Else' }), alwaysOk);

      expect(result).toEqual({ status: 'already_registered' });
      const [stored] = await db.select().from(dUsers).where(eq(dUsers.email, PERSON.email));
      expect(stored?.name).toBe('Jamie Rivera');
      expect(await consentCount()).toBe(1);
    });

    it('refuses the same e-mail registered at the same moment, leaving a single account', async () => {
      const results = await Promise.all([
        register(registerInput(), alwaysOk),
        register(registerInput({ name: 'Twin' }), alwaysOk),
      ]);

      expect(results.map((result) => result.status).sort()).toEqual(['already_registered', 'registered']);
      expect(await userCountByEmail(PERSON.email)).toBe(1);
      expect(await consentCount()).toBe(1);
    });
  });
});
