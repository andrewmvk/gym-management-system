import type { EmailMessage, EmailResult } from '@api/lib/email';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '@api/config/env';
import { db, pool } from '@api/db/client';
import { dUsers } from '@api/db/schema';
import { sendOnboardingInvite } from '@api/modules/onboarding/invite-subscriber';
import { resetTestDatabase } from '@api/test/database';

async function createUser(email: string) {
  const [user] = await db.insert(dUsers).values({ email, name: 'Onboarding Invite Test' }).returning();
  return user!;
}

describe('sendOnboardingInvite', () => {
  beforeEach(resetTestDatabase);
  afterAll(() => pool.end());

  it('sends exactly one e-mail containing the onboarding link', async () => {
    const user = await createUser('invite-target@example.com');
    const send = vi.fn<(message: EmailMessage) => Promise<EmailResult>>().mockResolvedValue({ ok: true });

    await sendOnboardingInvite(user.id, send);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'invite-target@example.com', text: expect.stringContaining(`${env.WEB_ORIGIN}/onboarding`) }),
    );
  });

  it('does not throw when the e-mail provider fails', async () => {
    const user = await createUser('invite-failure@example.com');
    const send = vi.fn<(message: EmailMessage) => Promise<EmailResult>>().mockResolvedValue({ ok: false });

    await expect(sendOnboardingInvite(user.id, send)).resolves.toBeUndefined();
  });

  it('does nothing for an unknown userId', async () => {
    const send = vi.fn<(message: EmailMessage) => Promise<EmailResult>>().mockResolvedValue({ ok: true });

    await sendOnboardingInvite('00000000-0000-0000-0000-000000000000', send);

    expect(send).not.toHaveBeenCalled();
  });
});
