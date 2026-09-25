import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmailSender } from '@api/lib/email';

const API_KEY = 're_test_secret_key';
const MESSAGE = {
  to: 'member@example.com',
  subject: 'Complete your onboarding',
  text: 'Open http://localhost:3000/onboarding to continue.',
  html: '<p>Open the link</p>',
};

function logSpy() {
  return { info: vi.fn(), warn: vi.fn() };
}

afterEach(() => vi.unstubAllGlobals());

describe('sendEmail', () => {
  it('writes the recipient, subject and link to the log without any network call in log mode', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const log = logSpy();

    const result = await createEmailSender({ mode: 'log', log: log as never })(MESSAGE);

    expect(result).toEqual({ ok: true });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledWith(
      { to: MESSAGE.to, subject: MESSAGE.subject, text: MESSAGE.text },
      expect.any(String),
    );
  });

  it('posts the message to Resend with the configured sender', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"id":"1"}', { status: 200 }));
    const send = createEmailSender({ mode: 'resend', apiKey: API_KEY, from: 'Cadence <a@b.dev>', fetch: fetchMock, log: logSpy() as never });

    await expect(send(MESSAGE)).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.resend.com/emails');
    expect(JSON.parse(init!.body as string)).toEqual({ from: 'Cadence <a@b.dev>', ...MESSAGE });
    expect((init!.headers as Record<string, string>).Authorization).toBe(`Bearer ${API_KEY}`);
  });

  it.each([
    ['a provider error status', () => Promise.resolve(new Response('invalid', { status: 422 }))],
    ['a network error', () => Promise.reject(new TypeError('fetch failed'))],
  ])('returns ok false without throwing on %s and never logs the key', async (_, respond) => {
    const log = logSpy();
    const send = createEmailSender({ mode: 'resend', apiKey: API_KEY, from: 'x@y.dev', fetch: vi.fn(respond) as never, log: log as never });

    await expect(send(MESSAGE)).resolves.toEqual({ ok: false });
    expect(log.warn).toHaveBeenCalledOnce();
    expect(JSON.stringify([log.warn.mock.calls, log.info.mock.calls])).not.toContain(API_KEY);
  });
});
