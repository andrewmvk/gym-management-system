import type { JsonStreamEvent } from '@api/modules/ai/json-stream';
import { createAiRunner } from '@api/modules/ai/structured-runner';
import type { AiResult, AiTool } from '@api/modules/ai/types';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const ReplySchema = z.object({ reply: z.string(), quickReplies: z.array(z.string()).nullish() });

function sse(chunks: readonly string[]) {
  const lines = chunks.map((content) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`);
  lines.push('data: [DONE]\n\n');
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const line of lines) controller.enqueue(encoder.encode(line));
        controller.close();
      },
    }),
    { status: 200 },
  );
}

function setup(responses: Response[], tools?: AiTool[]) {
  const fetchMock = vi.fn<typeof fetch>();
  for (const response of responses) fetchMock.mockResolvedValueOnce(response);
  const log = { warn: vi.fn() };
  const runner = createAiRunner({ mode: 'live', apiKey: 'key', model: 'model', fetch: fetchMock, log: log as never });
  async function collect() {
    const events: JsonStreamEvent[] = [];
    let result: AiResult<z.infer<typeof ReplySchema>> | undefined;
    for await (const item of runner.streamStructured({
      purpose: 'chat',
      system: 'You are a coach.',
      user: 'Hi',
      schema: ReplySchema,
      tools,
    })) {
      if (item.type === 'event') events.push(item.event);
      else result = item.result;
    }
    return { events, result };
  }
  return { fetchMock, log, collect };
}

describe('streamStructured in live mode', () => {
  it('forwards events while the answer arrives and ends with the validated result', async () => {
    const { fetchMock, collect } = setup([sse(['{"reply": "He', 'llo", "quickReplies": ["a"', ', "b"]}'])]);

    const { events, result } = await collect();

    expect(
      events.filter((event) => event.type === 'delta').map((event) => event.type === 'delta' && event.text),
    ).toEqual(['He', 'llo']);
    expect(events.find((event) => event.type === 'value' && event.key === 'quickReplies')).toMatchObject({
      value: ['a', 'b'],
    });
    expect(result).toEqual({ ok: true, data: { reply: 'Hello', quickReplies: ['a', 'b'] } });
    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string).stream).toBe(true);
  });

  it('runs a requested tool, holds back that turn, and answers from the result', async () => {
    const run = vi.fn().mockResolvedValue('Squat: trains quads');
    const tool: AiTool = {
      name: 'getExerciseDetails',
      description: 'Details of one exercise',
      input: z.object({ exerciseId: z.string() }),
      run,
    };
    const { fetchMock, collect } = setup(
      [
        sse(['{"toolCalls": [{"name": "getExerciseDetails", "arguments": {"exerciseId": "abc"}}]}']),
        sse(['{"reply": "Squats train quads."}']),
      ],
      [tool],
    );

    const { events, result } = await collect();

    expect(run).toHaveBeenCalledWith({ exerciseId: 'abc' });
    expect(events.some((event) => event.key === 'toolCalls')).toBe(false);
    expect(result).toEqual({ ok: true, data: { reply: 'Squats train quads.' } });
    const secondRequest = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string);
    expect(secondRequest.messages.at(-1).content).toContain('Squat: trains quads');
    expect(secondRequest.messages[0].content).toContain('getExerciseDetails');
  });

  it('reports a failed lookup to the model instead of throwing', async () => {
    const tool: AiTool = {
      name: 'lookup',
      description: 'Fails',
      input: z.object({}),
      run: () => Promise.reject(new Error('db down')),
    };
    const { fetchMock, collect } = setup(
      [sse(['{"toolCalls": [{"name": "lookup"}]}']), sse(['{"reply": "Could not check."}'])],
      [tool],
    );

    const { result } = await collect();

    expect(result).toEqual({ ok: true, data: { reply: 'Could not check.' } });
    expect(JSON.parse(fetchMock.mock.calls[1]![1]!.body as string).messages.at(-1).content).toContain(
      'lookup: error, lookup failed',
    );
  });

  it('retries an invalid answer once when nothing has been forwarded yet', async () => {
    const { fetchMock, collect } = setup([sse(['{"nope": 1}']), sse(['{"reply": "ok"}'])]);

    const { result } = await collect();

    expect(result).toEqual({ ok: true, data: { reply: 'ok' } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry once part of the answer has reached the caller', async () => {
    const { fetchMock, log, collect } = setup([sse(['{"quickReplies": ["a"], "reply": 5}']), sse(['{"reply": "ok"}'])]);

    const { result } = await collect();

    expect(result).toEqual({ ok: false, reason: 'invalid_output' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(log.warn).toHaveBeenCalledWith(
      { purpose: 'chat', reason: 'invalid_output', cause: 'schema:reply' },
      'ai call failed',
    );
  });

  it('keeps what completed when the model is cut off mid-answer', async () => {
    const { log, collect } = setup([
      sse(['{"reply": "Hello", "quickReplies": ["a", "b"], "planProposal": {"date": "20']),
    ]);

    const { result } = await collect();

    expect(result).toEqual({ ok: true, data: { reply: 'Hello', quickReplies: ['a', 'b'] } });
    expect(log.warn).toHaveBeenCalledWith(
      { purpose: 'chat', cause: 'not_json' },
      'ai answer salvaged from a cut-off reply',
    );
  });

  it('shows the model the strict shape while accepting a forgiving one', async () => {
    const strict = z.object({ reply: z.string(), count: z.number().int().max(3) });
    const forgiving = z.object({ reply: z.string(), count: z.number() });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(sse(['{"reply": "ok", "count": 9}']));
    const runner = createAiRunner({
      mode: 'live',
      apiKey: 'key',
      model: 'model',
      fetch: fetchMock,
      log: { warn: vi.fn() } as never,
    });

    let result: AiResult<z.infer<typeof forgiving>> | undefined;
    for await (const item of runner.streamStructured({
      purpose: 'chat',
      system: 's',
      user: 'u',
      schema: forgiving,
      instructionSchema: strict,
    })) {
      if (item.type === 'result') result = item.result;
    }

    expect(result).toEqual({ ok: true, data: { reply: 'ok', count: 9 } });
    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string).messages[0].content).toContain('"maximum":3');
  });

  it('returns unavailable when the request fails', async () => {
    const { log, collect } = setup([new Response('rate limited', { status: 429 })]);

    const { result } = await collect();

    expect(result).toEqual({ ok: false, reason: 'unavailable' });
    expect(log.warn).toHaveBeenCalledWith(
      { purpose: 'chat', reason: 'unavailable', cause: 'http_429' },
      'ai call failed',
    );
  });
});

describe('streamStructured in mock mode', () => {
  it('streams the purpose fixture as events and a result', async () => {
    const runner = createAiRunner({ mode: 'mock', log: { warn: vi.fn() } as never });
    const items = [];
    for await (const item of runner.streamStructured({
      purpose: 'chat',
      system: 's',
      user: 'u',
      schema: ReplySchema,
    })) {
      items.push(item);
    }

    expect(items.at(-1)).toMatchObject({ type: 'result', result: { ok: true } });
    expect(items.some((item) => item.type === 'event' && item.event.type === 'delta')).toBe(true);
  });
});
