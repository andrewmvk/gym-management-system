import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { env } from '@api/config/env';
import { db, pool } from '@api/db/client';
import { dUsers, fConsentEvents, fUserPolicyGroupOnUser, fUserPolicyOnUser } from '@api/db/schema';
import { SEED_ADMIN_EMAIL, seedBase } from '@api/db/seed';
import { logger } from '@api/lib/logger';
import { SESSION_COOKIE, signSessionToken } from '@api/modules/auth/session';
import { resetTestDatabase } from '@api/test/database';
import { appRouter } from '@api/trpc/app-router';
import { createContext } from '@api/trpc/context';
import { assertCan, authedProcedure, createCallerFactory, router } from '@api/trpc/procedures';
import { MEMBER_GROUP, MEMBER_POLICY_IDS, READ_STAFF_APP } from '@cadence/shared/auth';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const MEMBER_EMAIL = 'member@example.com';
const MEMBER_PASSWORD = 'member-password';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const staffOnlyRouter = router({
  staffArea: authedProcedure.query(({ ctx }) => {
    assertCan(ctx.ability, 'read', 'StaffApp');
    return 'staff content';
  }),
});

async function contextFor(token?: string) {
  const res = { cookie: vi.fn(), clearCookie: vi.fn() };
  const req = { cookies: token ? { [SESSION_COOKIE]: token } : {}, log: logger };
  const ctx = await createContext({ req, res } as unknown as CreateExpressContextOptions);
  return { ctx, res };
}

async function callerFor(token?: string) {
  const { ctx, res } = await contextFor(token);
  return { caller: createCallerFactory(appRouter)(ctx), staffCaller: createCallerFactory(staffOnlyRouter)(ctx), res };
}

async function createMember(options: { hasPassword?: boolean } = {}) {
  const [member] = await db
    .insert(dUsers)
    .values({
      email: MEMBER_EMAIL,
      name: 'Demo Member',
      passwordHash: options.hasPassword === false ? null : await bcrypt.hash(MEMBER_PASSWORD, 4),
      membershipStatus: 'active',
      membershipPlan: 'monthly',
    })
    .returning();
  await db
    .insert(fUserPolicyOnUser)
    .values(MEMBER_POLICY_IDS.map((policyId) => ({ userId: member!.id, policyId, effect: 'granted' as const })));
  return member!;
}

async function adminId() {
  const [admin] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_ADMIN_EMAIL));
  return admin!.id;
}

const REGISTRATION_PASSWORD = 'a-strong-password';
const REFERENCE_PHOTO = fileURLToPath(new URL('../../test/fixtures/faces/valid/reference.jpg', import.meta.url));

// The fixture is a real face, so the registration works whichever FACE_EMBEDDING_MODE the environment sets.
async function registrationInput(overrides: { email?: string; password?: string; consented?: boolean } = {}) {
  const photo = await readFile(REFERENCE_PHOTO);
  return {
    name: 'Jamie Rivera',
    phone: '+1 555-0100',
    email: overrides.email ?? 'jamie.rivera@example.com',
    birthdate: '1995-06-12',
    consented: (overrides.consented ?? true) as true,
    photo: { imageBase64: photo.toString('base64'), mimeType: 'image/jpeg' },
    password: overrides.password ?? REGISTRATION_PASSWORD,
  };
}

describe('auth', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });
  afterEach(() => {
    env.NODE_ENV = 'test';
  });
  afterAll(() => pool.end());

  describe('login', () => {
    it('returns the user without the hash and sets the session cookie', async () => {
      await createMember();
      const { caller, res } = await callerFor();

      const result = await caller.auth.login({ email: MEMBER_EMAIL, password: MEMBER_PASSWORD });

      expect(result?.user.email).toBe(MEMBER_EMAIL);
      expect(result?.user.membershipStatus).toBe('active');
      expect(result?.user).not.toHaveProperty('passwordHash');
      expect(res.cookie).toHaveBeenCalledWith(SESSION_COOKIE, expect.any(String), {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        path: '/',
        maxAge: SEVEN_DAYS_MS,
      });
    });

    it('marks the cookie Secure only in production', async () => {
      await createMember();
      env.NODE_ENV = 'production';
      const { caller, res } = await callerFor();

      await caller.auth.login({ email: MEMBER_EMAIL, password: MEMBER_PASSWORD });

      expect(res.cookie).toHaveBeenCalledWith(
        SESSION_COOKIE,
        expect.any(String),
        expect.objectContaining({ secure: true }),
      );
    });

    it('answers a wrong password and an unknown e-mail with the same generic error', async () => {
      await createMember();
      const { caller, res } = await callerFor();

      const wrongPassword = caller.auth.login({ email: MEMBER_EMAIL, password: 'nope' });
      const unknownEmail = caller.auth.login({ email: 'ghost@example.com', password: MEMBER_PASSWORD });

      const expected = { code: 'UNAUTHORIZED', message: 'Invalid e-mail or password' };
      await expect(wrongPassword).rejects.toMatchObject(expected);
      await expect(unknownEmail).rejects.toMatchObject(expected);
      expect(res.cookie).not.toHaveBeenCalled();
    });

    it('refuses a user who has no password yet', async () => {
      await createMember({ hasPassword: false });
      const { caller } = await callerFor();

      await expect(caller.auth.login({ email: MEMBER_EMAIL, password: 'anything' })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    describe('inactive membership', () => {
      async function deactivate(memberId: string) {
        await db.update(dUsers).set({ membershipStatus: 'inactive' }).where(eq(dUsers.id, memberId));
      }

      it('refuses a correct password with the front-desk message and sets no cookie', async () => {
        const member = await createMember();
        await deactivate(member.id);
        const { caller, res } = await callerFor();

        await expect(caller.auth.login({ email: MEMBER_EMAIL, password: MEMBER_PASSWORD })).rejects.toMatchObject({
          code: 'FORBIDDEN',
          message: 'Your membership is inactive. Ask the front desk to reactivate it.',
        });
        expect(res.cookie).not.toHaveBeenCalled();
      });

      it('keeps the generic error for a wrong password so inactivity is not revealed', async () => {
        const member = await createMember();
        await deactivate(member.id);
        const { caller } = await callerFor();

        await expect(caller.auth.login({ email: MEMBER_EMAIL, password: 'nope' })).rejects.toMatchObject({
          code: 'UNAUTHORIZED',
          message: 'Invalid e-mail or password',
        });
      });

      it('signs in again once the membership is reactivated', async () => {
        const member = await createMember();
        await deactivate(member.id);
        await db.update(dUsers).set({ membershipStatus: 'active' }).where(eq(dUsers.id, member.id));
        const { caller } = await callerFor();

        expect((await caller.auth.login({ email: MEMBER_EMAIL, password: MEMBER_PASSWORD }))?.user.email).toBe(
          MEMBER_EMAIL,
        );
      });

      it('turns an existing session cookie into no session at all', async () => {
        const member = await createMember();
        const token = signSessionToken(member.id);
        expect((await (await callerFor(token)).caller.auth.me())?.user.id).toBe(member.id);

        await deactivate(member.id);

        expect(await (await callerFor(token)).caller.auth.me()).toBeNull();
        await expect((await callerFor(token)).caller.auth.listMembers()).rejects.toMatchObject({
          code: 'UNAUTHORIZED',
        });
      });

      it('never affects staff, who have no membership status', async () => {
        const token = signSessionToken(await adminId());

        expect((await (await callerFor(token)).caller.auth.me())?.user.email).toBe(SEED_ADMIN_EMAIL);
      });
    });
  });

  describe('me', () => {
    it('returns the user and the serialized ability rules for a valid session', async () => {
      const member = await createMember();
      const { caller } = await callerFor(signSessionToken(member.id));

      const me = await caller.auth.me();

      expect(me?.user.id).toBe(member.id);
      expect(me?.user).not.toHaveProperty('passwordHash');
      expect(me?.rules).toContainEqual({ action: 'read', subject: 'MemberApp' });
    });

    it('treats a tampered token as unauthenticated', async () => {
      const member = await createMember();
      const token = signSessionToken(member.id);
      const tampered = `${token.slice(0, -2)}${token.endsWith('aa') ? 'bb' : 'aa'}`;
      const { caller } = await callerFor(tampered);

      expect(await caller.auth.me()).toBeNull();
    });

    it('treats an expired token as unauthenticated', async () => {
      const member = await createMember();
      const expired = jwt.sign({ userId: member.id }, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: -10 });
      const { caller } = await callerFor(expired);

      expect(await caller.auth.me()).toBeNull();
    });
  });

  describe('authorization', () => {
    it('gates the member and staff areas by ability, not by who the user is', async () => {
      const member = await createMember();
      const { ctx: memberCtx } = await contextFor(signSessionToken(member.id));
      const { ctx: adminCtx } = await contextFor(signSessionToken(await adminId()));

      expect(memberCtx.ability.can('read', 'MemberApp')).toBe(true);
      expect(memberCtx.ability.can('read', 'StaffApp')).toBe(false);
      expect(adminCtx.ability.can('read', 'StaffApp')).toBe(true);
      expect(adminCtx.ability.can('read', 'MemberApp')).toBe(false);
    });

    it('answers FORBIDDEN to a member-only user on a staff procedure', async () => {
      const member = await createMember();
      const { staffCaller } = await callerFor(signSessionToken(member.id));

      await expect(staffCaller.staffArea()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('answers UNAUTHORIZED without a session and lets staff through', async () => {
      const { staffCaller: anonymous } = await callerFor();
      const { staffCaller: admin } = await callerFor(signSessionToken(await adminId()));

      await expect(anonymous.staffArea()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
      await expect(admin.staffArea()).resolves.toBe('staff content');
    });

    it('drops a denied staff policy on the next request', async () => {
      const id = await adminId();
      await db.insert(fUserPolicyOnUser).values({ userId: id, policyId: READ_STAFF_APP, effect: 'denied' });
      const { staffCaller } = await callerFor(signSessionToken(id));

      await expect(staffCaller.staffArea()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });
  });

  describe('register', () => {
    it('creates the member in one request: member group, active membership, a session, and nextStep onboarding', async () => {
      const { caller, res } = await callerFor();

      const result = await caller.auth.register(await registrationInput());

      expect(result).toMatchObject({ status: 'registered', nextStep: 'onboarding' });
      if (result.status !== 'registered') return;
      expect(result.user.membershipStatus).toBe('active');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.rules).toContainEqual({ action: 'read', subject: 'MemberApp' });
      expect(res.cookie).toHaveBeenCalledWith(SESSION_COOKIE, expect.any(String), expect.any(Object));

      const memberships = await db
        .select({ groupId: fUserPolicyGroupOnUser.groupId })
        .from(fUserPolicyGroupOnUser)
        .where(eq(fUserPolicyGroupOnUser.userId, result.user.id));
      expect(memberships).toEqual([{ groupId: MEMBER_GROUP }]);
      expect(await db.select().from(fConsentEvents).where(eq(fConsentEvents.userId, result.user.id))).toHaveLength(1);
    });

    it('lets the new member log in with the chosen password right away', async () => {
      const { caller } = await callerFor();
      await caller.auth.register(await registrationInput());

      const login = await caller.auth.login({ email: 'jamie.rivera@example.com', password: REGISTRATION_PASSWORD });

      expect(login?.user.email).toBe('jamie.rivera@example.com');
    });

    it('refuses an already registered e-mail without a session', async () => {
      const { caller } = await callerFor();
      await caller.auth.register(await registrationInput());
      const second = await callerFor();

      const result = await second.caller.auth.register(await registrationInput());

      expect(result).toEqual({ status: 'already_registered' });
      expect(second.res.cookie).not.toHaveBeenCalled();
    });

    it('refuses a password shorter than 8 characters and a missing consent, storing nothing', async () => {
      const { caller } = await callerFor();

      await expect(caller.auth.register(await registrationInput({ password: 'short' }))).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
      await expect(caller.auth.register(await registrationInput({ consented: false }))).rejects.toMatchObject({
        code: 'BAD_REQUEST',
      });
      expect(await db.select().from(fConsentEvents)).toHaveLength(0);
    });

    it('is public: it needs no session', async () => {
      const { caller } = await callerFor();

      expect(await caller.auth.checkEmail({ email: 'new@example.com' })).toEqual({ status: 'available' });
    });
  });

  describe('listMembers', () => {
    it('lists each member with the membership fields and no biometric field, for an admin', async () => {
      const member = await createMember();
      const { caller } = await callerFor(signSessionToken(await adminId()));

      const members = await caller.auth.listMembers();

      expect(members.map((row) => row.email)).toContain(MEMBER_EMAIL);
      expect(members.map((row) => row.email)).not.toContain(SEED_ADMIN_EMAIL);
      expect(members.find((row) => row.id === member.id)).toEqual({
        id: member.id,
        name: 'Demo Member',
        email: MEMBER_EMAIL,
        membershipStatus: 'active',
        membershipPlan: 'monthly',
      });
    });

    it('refuses a member and a signed-out caller', async () => {
      const member = await createMember();

      const asMember = await callerFor(signSessionToken(member.id));
      await expect(asMember.caller.auth.listMembers()).rejects.toMatchObject({ code: 'FORBIDDEN' });

      const signedOut = await callerFor();
      await expect(signedOut.caller.auth.listMembers()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });
  });

  it('logout clears the session cookie', async () => {
    const { caller, res } = await callerFor();

    await caller.auth.logout();

    expect(res.clearCookie).toHaveBeenCalledWith(
      SESSION_COOKIE,
      expect.objectContaining({ httpOnly: true, path: '/' }),
    );
  });
});
