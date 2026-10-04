import { env } from '@api/config/env';
import { sendEmail as defaultSendEmail } from '@api/lib/email';
import { logger } from '@api/lib/logger';
import { subscribeToRegistrationCompleted } from '@api/modules/auth/registration-completed';
import { findUserById } from '@api/modules/auth/repository';

const log = logger.child({ module: 'onboarding' });

// FR-10: fired once per registration via onRegistrationCompleted. The link goes to the login page, not to
// onboarding: after login the gate redirects the member there. A provider failure is logged and never
// thrown - onRegistrationCompleted's own catch-all is a backstop for something unexpected, not how this
// specific, expected failure is handled.
export async function sendRegistrationEmail(userId: string, sendEmail: typeof defaultSendEmail = defaultSendEmail) {
  const user = await findUserById(userId);
  if (!user) return;

  const link = `${env.WEB_ORIGIN}/login`;
  const result = await sendEmail({
    to: user.email,
    subject: 'Welcome to Cadence',
    text: `Welcome to Cadence! Your account is ready. Sign in here to finish setting up your profile: ${link}`,
  });
  if (!result.ok) log.warn({ userId }, 'registration e-mail failed to send');
}

export function registerRegistrationEmailSubscriber() {
  subscribeToRegistrationCompleted(sendRegistrationEmail);
}
