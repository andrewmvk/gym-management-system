import { db, pool } from '@api/db/client';
import { dUsers, fUserPolicyOnUser } from '@api/db/schema';
import { SEED_ADMIN_EMAIL, seedBase } from '@api/db/seed';
import { logger } from '@api/lib/logger';
import { signSessionToken } from '@api/modules/auth/session';
import { resetTestDatabase } from '@api/test/database';
import { appRouter } from '@api/trpc/app-router';
import { createContext } from '@api/trpc/context';
import { createCallerFactory } from '@api/trpc/procedures';
import { MEMBER_POLICY_IDS } from '@cadence/shared/auth';
import type { OnboardingSubmitInput } from '@cadence/shared/schemas/onboarding';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

async function createUser(email: string, policyIds: readonly string[]) {
  const [user] = await db
    .insert(dUsers)
    .values({ email, name: 'Onboarding Test User', passwordHash: await bcrypt.hash('password123', 4) })
    .returning();
  if (policyIds.length > 0) {
    await db
      .insert(fUserPolicyOnUser)
      .values(policyIds.map((policyId) => ({ userId: user!.id, policyId, effect: 'granted' as const })));
  }
  return user!;
}

async function callerFor(token?: string) {
  const req = { cookies: token ? { cadence_session: token } : {}, log: logger };
  const res = { cookie: () => {}, clearCookie: () => {} };
  const ctx = await createContext({ req, res } as never);
  return createCallerFactory(appRouter)(ctx);
}

function basicInput(overrides: Partial<OnboardingSubmitInput> = {}): OnboardingSubmitInput {
  return {
    heightCm: 178,
    weightKg: 82.5,
    medications: ['Ibuprofen'],
    physicalConditions: { conditions: ['Knee injury'], otherNotes: 'Prefers morning sessions' },
    goals: 'Lose weight and build endurance',
    exams: [],
    ...overrides,
  };
}

describe('onboarding', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });
  afterAll(() => pool.end());

  it('submits the physical information, goals and medications', async () => {
    const member = await createUser('member1@example.com', MEMBER_POLICY_IDS);
    const caller = await callerFor(signSessionToken(member.id));

    const result = await caller.onboarding.submit(basicInput());

    expect(result).toMatchObject({ heightCm: 178, weightKg: 82.5, medications: ['Ibuprofen'], exams: [] });
    expect(result.goals).toBe('Lose weight and build endurance');
  });

  it('requires height and weight', async () => {
    const member = await createUser('member-measures@example.com', MEMBER_POLICY_IDS);
    const caller = await callerFor(signSessionToken(member.id));
    const { heightCm: _height, ...withoutHeight } = basicInput();
    const { weightKg: _weight, ...withoutWeight } = basicInput();

    await expect(caller.onboarding.submit(withoutHeight as OnboardingSubmitInput)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    await expect(caller.onboarding.submit(withoutWeight as OnboardingSubmitInput)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    await expect(caller.onboarding.submit(basicInput({ heightCm: 17.5 }))).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    await expect(caller.onboarding.submit(basicInput({ weightKg: 70.55 }))).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    expect(await caller.onboarding.listMine()).toEqual([]);
  });

  it('accepts none for exams and medications', async () => {
    const member = await createUser('member-none@example.com', MEMBER_POLICY_IDS);
    const caller = await callerFor(signSessionToken(member.id));

    const result = await caller.onboarding.submit(
      basicInput({ exams: [], medications: [], physicalConditions: { conditions: [] } }),
    );

    expect(result).toMatchObject({ exams: [], medications: [] });
    expect((await caller.onboarding.getStatus()).completed).toBe(true);
  });

  it('stores the typed findings of each exam and its attachment through the uploads adapter', async () => {
    const member = await createUser('member-exams@example.com', MEMBER_POLICY_IDS);
    const caller = await callerFor(signSessionToken(member.id));

    const result = await caller.onboarding.submit(
      basicInput({
        exams: [
          {
            name: 'Knee X-ray',
            date: '2026-08-12',
            findings: 'Mild narrowing, no fracture.',
            attachment: { filename: 'xray.jpg', mimeType: 'image/jpeg', base64: TINY_JPEG_BASE64 },
          },
          { name: 'Blood test', findings: 'All values normal.' },
        ],
      }),
    );

    expect(result.exams).toHaveLength(2);
    expect(result.exams[0]).toMatchObject({
      name: 'Knee X-ray',
      date: '2026-08-12',
      findings: 'Mild narrowing, no fracture.',
    });
    expect(result.exams[0]?.attachmentPath).toMatch(new RegExp(`^${member.id}/exam/.+\\.jpg$`));
    expect(result.exams[1]).toEqual({ name: 'Blood test', findings: 'All values normal.' });
  });

  it('keeps the attachment an exam already had when the update form sends its path back', async () => {
    const member = await createUser('member-keep@example.com', MEMBER_POLICY_IDS);
    const caller = await callerFor(signSessionToken(member.id));
    const first = await caller.onboarding.submit(
      basicInput({
        exams: [
          {
            name: 'Knee X-ray',
            findings: 'Mild narrowing.',
            attachment: { filename: 'xray.jpg', mimeType: 'image/jpeg', base64: TINY_JPEG_BASE64 },
          },
        ],
      }),
    );
    const keptPath = first.exams[0]!.attachmentPath!;

    const second = await caller.onboarding.submit(
      basicInput({ exams: [{ name: 'Knee X-ray', findings: 'Unchanged.', attachmentPath: keptPath }] }),
    );

    expect(second.exams[0]?.attachmentPath).toBe(keptPath);
  });

  it('refuses an exam attachment path that is not one of the member’s own exam files', async () => {
    const member = await createUser('member-path@example.com', MEMBER_POLICY_IDS);
    const other = await createUser('member-other@example.com', MEMBER_POLICY_IDS);
    const caller = await callerFor(signSessionToken(member.id));
    const foreignPath = `${other.id}/exam/00000000-0000-0000-0000-000000000000.jpg`;

    await expect(
      caller.onboarding.submit(basicInput({ exams: [{ name: 'X-ray', findings: 'ok', attachmentPath: foreignPath }] })),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(
      caller.onboarding.submit(
        basicInput({ exams: [{ name: 'X-ray', findings: 'ok', attachmentPath: '../../etc/passwd' }] }),
      ),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('requires a name and typed findings for every exam', async () => {
    const member = await createUser('member-incomplete@example.com', MEMBER_POLICY_IDS);
    const caller = await callerFor(signSessionToken(member.id));

    await expect(
      caller.onboarding.submit(basicInput({ exams: [{ name: 'X-ray', findings: '  ' }] })),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(caller.onboarding.submit(basicInput({ exams: [{ name: '', findings: 'ok' }] }))).rejects.toMatchObject(
      { code: 'BAD_REQUEST' },
    );
  });

  it('keeps both rows when a member submits twice', async () => {
    const member = await createUser('member2@example.com', MEMBER_POLICY_IDS);
    const caller = await callerFor(signSessionToken(member.id));

    await caller.onboarding.submit(basicInput({ goals: 'First goal' }));
    await caller.onboarding.submit(basicInput({ goals: 'Second goal' }));

    const submissions = await caller.onboarding.listMine();
    expect(submissions).toHaveLength(2);
    expect(submissions.map((s) => s.goals).sort()).toEqual(['First goal', 'Second goal']);
  });

  it('reports getStatus false until the first submission, then true', async () => {
    const member = await createUser('member3@example.com', MEMBER_POLICY_IDS);
    const caller = await callerFor(signSessionToken(member.id));

    expect(await caller.onboarding.getStatus()).toEqual({ completed: false, lastSubmittedAt: null });

    await caller.onboarding.submit(basicInput());

    const status = await caller.onboarding.getStatus();
    expect(status.completed).toBe(true);
    expect(status.lastSubmittedAt).not.toBeNull();
  });

  it('only ever returns the caller’s own submissions', async () => {
    const memberA = await createUser('member-a@example.com', MEMBER_POLICY_IDS);
    const memberB = await createUser('member-b@example.com', MEMBER_POLICY_IDS);
    await (await callerFor(signSessionToken(memberA.id))).onboarding.submit(basicInput());

    const bSubmissions = await (await callerFor(signSessionToken(memberB.id))).onboarding.listMine();

    expect(bSubmissions).toEqual([]);
  });

  it('refuses a signed-out caller', async () => {
    const caller = await callerFor();

    await expect(caller.onboarding.submit(basicInput())).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('refuses a staff account that has no manage_own_onboarding grant', async () => {
    const [admin] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_ADMIN_EMAIL));
    const caller = await callerFor(signSessionToken(admin!.id));

    await expect(caller.onboarding.submit(basicInput())).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('rejects an invalid exam attachment with a clear message and stores nothing', async () => {
    const member = await createUser('member4@example.com', MEMBER_POLICY_IDS);
    const caller = await callerFor(signSessionToken(member.id));

    await expect(
      caller.onboarding.submit(
        basicInput({
          exams: [
            {
              name: 'Notes',
              findings: 'ok',
              attachment: { filename: 'notes.txt', mimeType: 'text/plain', base64: 'not-a-real-file' },
            },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(await caller.onboarding.listMine()).toEqual([]);
  });
});
