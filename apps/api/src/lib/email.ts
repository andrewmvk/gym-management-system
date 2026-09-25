import { env } from '@api/config/env';
import { logger, type Logger } from '@api/lib/logger';

const RESEND_EMAILS_URL = 'https://api.resend.com/emails';
const EMAIL_REQUEST_TIMEOUT_MS = 10_000;

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export type EmailResult = { ok: true } | { ok: false };

export type EmailSenderConfig =
  | { mode: 'log'; log: Pick<Logger, 'info' | 'warn'> }
  | { mode: 'resend'; apiKey: string; from: string; fetch?: typeof fetch; log: Pick<Logger, 'info' | 'warn'> };

export function createEmailSender(config: EmailSenderConfig) {
  return async function sendEmail(message: EmailMessage): Promise<EmailResult> {
    if (config.mode === 'log') {
      config.log.info({ to: message.to, subject: message.subject, text: message.text }, 'email not sent (log mode)');
      return { ok: true };
    }

    const doFetch = config.fetch ?? fetch;
    try {
      const response = await doFetch(RESEND_EMAILS_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: config.from, ...message }),
        signal: AbortSignal.timeout(EMAIL_REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) {
        config.log.warn({ status: response.status }, 'email provider rejected the message');
        return { ok: false };
      }
      return { ok: true };
    } catch {
      config.log.warn({ reason: 'unavailable' }, 'email provider unreachable');
      return { ok: false };
    }
  };
}

const log = logger.child({ module: 'email' });

// The env loader guarantees the key whenever EMAIL_MODE is resend.
export const sendEmail =
  env.EMAIL_MODE === 'log'
    ? createEmailSender({ mode: 'log', log })
    : createEmailSender({ mode: 'resend', apiKey: env.RESEND_API_KEY!, from: env.EMAIL_FROM, log });
