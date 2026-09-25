import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AI_REQUEST_TIMEOUT_MS } from '@api/modules/ai/client';
import type { MockSwitches } from '@api/modules/ai/mock-fixtures';
import { createAiRunner } from '@api/modules/ai/structured-runner';
import { AiVerdictSchema, type AiPurpose } from '@api/modules/ai/types';

const API_KEY = 'sk-or-test-secret-key';
const MODEL = 'test/free-model';
const SYSTEM_PROMPT = 'You evaluate a health questionnaire.';
const USER_PROMPT = 'Member Jane Doe reports a heart condition.';

const PlanSchema = z.object({
  exercises: z.array(z.object({ exerciseId: z.string(), sets: z.number(), reps: z.number() })),
});
const ChatSchema = z.object({ reply: z.string(), facts: z.array(z.unknown()) });

function completion(content: string) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}

function setup(responses: (() => Promise<Response>)[]) {
  const fetchMock = vi.fn<typeof fetch>();
  for (const respond of responses) fetchMock.mockImplementationOnce(respond);
  const log = { warn: vi.fn() };
  const runner = createAiRunner({ mode: 'live', apiKey: API_KEY, model: MODEL, fetch: fetchMock, log: log as never });
  const run = (purpose: AiPurpose = 'aptitude') =>
    runner.runStructured({ purpose, system: SYSTEM_PROMPT, user: USER_PROMPT, schema: AiVerdictSchema });
  return { fetchMock, log, run };
}

const valid = () => Promise.resolve(completion('{"verdict":"cleared","notes":"ok"}'));
const malformed = () => Promise.resolve(completion('{"verdict": cleared'));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('runStructured in live mode', () => {
  it('returns the validated data on a 200 and sends the configured model and key', async () => {
    const { fetchMock, run } = setup([valid]);

    await expect(run()).resolves.toEqual({ ok: true, data: { verdict: 'cleared', notes: 'ok' } });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init!.body as string);
    expect(body.model).toBe(MODEL);
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.messages[0].content).toContain(SYSTEM_PROMPT);
    expect((init!.headers as Record<string, string>).Authorization).toBe(`Bearer ${API_KEY}`);
  });

  it('accepts JSON wrapped in a markdown fence', async () => {
    const { run } = setup([() => Promise.resolve(completion('```json\n{"verdict":"not_cleared","notes":"x"}\n```'))]);

    await expect(run()).resolves.toEqual({ ok: true, data: { verdict: 'not_cleared', notes: 'x' } });
  });

  it.each([
    ['a 429', () => Promise.resolve(new Response('rate limited', { status: 429 }))],
    ['a 500', () => Promise.resolve(new Response('boom', { status: 500 }))],
    ['a network error', () => Promise.reject(new TypeError('fetch failed'))],
    ['a malformed envelope', () => Promise.resolve(new Response('<html>', { status: 200 }))],
  ])('returns unavailable without retrying on %s', async (_, respond) => {
    const { fetchMock, run } = setup([respond]);

    await expect(run()).resolves.toEqual({ ok: false, reason: 'unavailable' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns unavailable when the request times out', async () => {
    vi.useFakeTimers();
    const { fetchMock, run } = setup([]);
    fetchMock.mockImplementationOnce(
      (_, init) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );

    const pending = run();
    await vi.advanceTimersByTimeAsync(AI_REQUEST_TIMEOUT_MS);

    await expect(pending).resolves.toEqual({ ok: false, reason: 'unavailable' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries once on invalid JSON and then returns invalid_output', async () => {
    const { fetchMock, run } = setup([malformed, malformed, valid]);

    await expect(run()).resolves.toEqual({ ok: false, reason: 'invalid_output' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries once on output that fails the schema', async () => {
    const wrongShape = () => Promise.resolve(completion('{"verdict":"maybe","notes":"?"}'));
    const { fetchMock, run } = setup([wrongShape, wrongShape]);

    await expect(run()).resolves.toEqual({ ok: false, reason: 'invalid_output' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('succeeds when the retry returns valid output', async () => {
    const { fetchMock, run } = setup([malformed, valid]);

    await expect(run()).resolves.toEqual({ ok: true, data: { verdict: 'cleared', notes: 'ok' } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports unavailable when the retry hits a transport failure', async () => {
    const { run } = setup([malformed, () => Promise.resolve(new Response('', { status: 429 }))]);

    await expect(run()).resolves.toEqual({ ok: false, reason: 'unavailable' });
  });

  it('logs only the purpose and reason, never the key or the prompts', async () => {
    const { log, run } = setup([malformed, malformed]);

    await run('certificate');

    expect(log.warn).toHaveBeenCalledWith({ purpose: 'certificate', reason: 'invalid_output' }, 'ai call failed');
    const logged = JSON.stringify(log.warn.mock.calls);
    expect(logged).not.toContain(API_KEY);
    expect(logged).not.toContain(USER_PROMPT);
    expect(logged).not.toContain(SYSTEM_PROMPT);
  });
});

describe('runStructured in mock mode', () => {
  function mockRunner(switches: Partial<MockSwitches> = {}) {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const runner = createAiRunner({
      mode: 'mock',
      mock: { aptitude: 'cleared', certificate: 'cleared', ...switches },
      log: { warn: vi.fn() } as never,
    });
    return { fetchSpy, runner };
  }

  it.each(['aptitude', 'certificate'] as const)('honors each %s switch without touching the network', async (purpose) => {
    for (const verdict of ['cleared', 'not_cleared'] as const) {
      const { fetchSpy, runner } = mockRunner({ [purpose]: verdict });
      const result = await runner.runStructured({ purpose, system: '', user: '', schema: AiVerdictSchema });
      expect(result).toMatchObject({ ok: true, data: { verdict } });
      expect(fetchSpy).not.toHaveBeenCalled();
    }

    const { fetchSpy, runner } = mockRunner({ [purpose]: 'unavailable' });
    const result = await runner.runStructured({ purpose, system: '', user: '', schema: AiVerdictSchema });
    expect(result).toEqual({ ok: false, reason: 'unavailable' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns deterministic plan and chat fixtures', async () => {
    const { fetchSpy, runner } = mockRunner();

    const plan = await runner.runStructured({ purpose: 'plan', system: '', user: '', schema: PlanSchema });
    const chat = await runner.runStructured({ purpose: 'chat', system: '', user: '', schema: ChatSchema });

    expect(plan).toEqual({ ok: true, data: { exercises: [] } });
    expect(chat).toMatchObject({ ok: true, data: { facts: [] } });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns invalid_output when a fixture does not match the caller schema', async () => {
    const { runner } = mockRunner();

    const result = await runner.runStructured({ purpose: 'chat', system: '', user: '', schema: PlanSchema });

    expect(result).toEqual({ ok: false, reason: 'invalid_output' });
  });
});
