import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db, pool } from '@api/db/client';
import { dUsers } from '@api/db/schema';
import { SEED_ADMIN_EMAIL, seedBase } from '@api/db/seed';
import { logger } from '@api/lib/logger';
import { upsertQuestionnaire } from '@api/modules/aptitude/repository';
import { signSessionToken } from '@api/modules/auth/session';
import { resetTestDatabase } from '@api/test/database';
import { appRouter } from '@api/trpc/app-router';
import { createContext } from '@api/trpc/context';
import { createCallerFactory } from '@api/trpc/procedures';

const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

async function callerFor(token?: string) {
  const req = { cookies: token ? { cadence_session: token } : {}, log: logger };
  const res = { cookie: () => {}, clearCookie: () => {} };
  const ctx = await createContext({ req, res } as never);
  return createCallerFactory(appRouter)(ctx);
}

async function notClearedApplicant(caller: Awaited<ReturnType<typeof callerFor>>) {
  const created = await caller.aptitude.startSignup({
    name: 'Riley Chen',
    phone: '+1 555-0177',
    email: 'riley.chen@example.com',
    birthdate: '1992-08-11',
  });
  const userId = (created as { userId: string }).userId;
  // Force a not_cleared questionnaire state directly (router-level test doesn't need to exercise the AI mock).
  await upsertQuestionnaire({ userId, answers: [], aiResult: 'not_cleared', aiNotes: 'test setup' });
  return userId;
}

describe('certificates router', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedBase();
  });
  afterAll(() => pool.end());

  it('lets an applicant upload without a session', async () => {
    const caller = await callerFor();
    const userId = await notClearedApplicant(caller);

    const result = await caller.certificates.upload({
      userId,
      filename: 'certificate.jpg',
      mimeType: 'image/jpeg',
      base64: TINY_JPEG_BASE64,
    });

    expect(result).toEqual({ status: 'ok' });
  });

  it('refuses a signed-out caller on listQueue and review', async () => {
    const caller = await callerFor();

    await expect(caller.certificates.listQueue()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(
      caller.certificates.review({ certificateId: '00000000-0000-0000-0000-000000000000', result: 'confirm' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('refuses a member (no review_certificates grant) on listQueue and review', async () => {
    const [member] = await db
      .insert(dUsers)
      .values({ email: 'member-cert@example.com', name: 'Member', passwordHash: 'x' })
      .returning();
    const caller = await callerFor(signSessionToken(member!.id));

    await expect(caller.certificates.listQueue()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      caller.certificates.review({ certificateId: '00000000-0000-0000-0000-000000000000', result: 'confirm' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('lets an admin list the queue and review a certificate', async () => {
    const anonymous = await callerFor();
    const userId = await notClearedApplicant(anonymous);
    await anonymous.certificates.upload({ userId, filename: 'certificate.jpg', mimeType: 'image/jpeg', base64: TINY_JPEG_BASE64 });

    const [admin] = await db.select().from(dUsers).where(eq(dUsers.email, SEED_ADMIN_EMAIL));
    const adminCaller = await callerFor(signSessionToken(admin!.id));

    const queue = await adminCaller.certificates.listQueue();
    expect(queue).toHaveLength(1);

    const result = await adminCaller.certificates.review({ certificateId: queue[0]!.id, result: 'cleared' });
    expect(result).toMatchObject({ status: 'ok', aptitudeStatus: 'cleared' });
  });
});
