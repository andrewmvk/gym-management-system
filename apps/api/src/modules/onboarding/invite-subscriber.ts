import { env } from '@api/config/env';
import { sendEmail as defaultSendEmail } from '@api/lib/email';
import { logger } from '@api/lib/logger';
import { findUserById } from '@api/modules/auth/repository';
import { subscribeToMemberActivated } from '@api/modules/auth/member-activated';

const log = logger.child({ module: 'onboarding' });

// FR-10: fired once per activation via onMemberActivated (P-09). A provider failure is logged and
// never thrown - onMemberActivated's own catch-all is a backstop for something unexpected, not how
// this specific, expected failure is handled.
export async function sendOnboardingInvite(userId: string, sendEmail: typeof defaultSendEmail = defaultSendEmail) {
  const user = await findUserById(userId);
  if (!user) return;

  const link = `${env.WEB_ORIGIN}/onboarding`;
  const result = await sendEmail({
    to: user.email,
    subject: 'Finish setting up your Cadence account',
    text: `Welcome to Cadence! Complete your onboarding here: ${link}`,
  });
  if (!result.ok) log.warn({ userId }, 'onboarding invite e-mail failed to send');
}

export function registerOnboardingInviteSubscriber() {
  subscribeToMemberActivated(sendOnboardingInvite);
}
