import { env } from '@api/config/env';
import { db, pool } from '@api/db/client';
import { dUsers } from '@api/db/schema';
import type { EmailMessage, EmailResult } from '@api/lib/email';
import { sendRegistrationEmail } from '@api/modules/onboarding/invite-subscriber';
import { resetTestDatabase } from '@api/test/database';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

async function createUser(email: string) {
  const [user] = await db.insert(dUsers).values({ email, name: 'Registration E-mail Test' }).returning();
  return user!;
}

describe('sendRegistrationEmail', () => {
  beforeEach(resetTestDatabase);
  afterAll(() => pool.end());

  it('sends exactly one e-mail whose link goes to the login page, not to onboarding', async () => {
    const user = await createUser('registered@example.com');
    const send = vi.fn<(message: EmailMessage) => Promise<EmailResult>>().mockResolvedValue({ ok: true });

    await sendRegistrationEmail(user.id, send);

    expect(send).toHaveBeenCalledTimes(1);
    const message = send.mock.calls[0]![0];
    expect(message.to).toBe('registered@example.com');
    expect(message.text).toContain(`${env.WEB_ORIGIN}/login`);
    expect(message.text).not.toContain('/onboarding');
  });

  it('does not throw when the e-mail provider fails', async () => {
    const user = await createUser('registration-failure@example.com');
    const send = vi.fn<(message: EmailMessage) => Promise<EmailResult>>().mockResolvedValue({ ok: false });

    await expect(sendRegistrationEmail(user.id, send)).resolves.toBeUndefined();
  });

  it('does nothing for an unknown userId', async () => {
    const send = vi.fn<(message: EmailMessage) => Promise<EmailResult>>().mockResolvedValue({ ok: true });

    await sendRegistrationEmail('00000000-0000-0000-0000-000000000000', send);

    expect(send).not.toHaveBeenCalled();
  });
});
