import type { Logger } from '@api/lib/logger';
import { type ConversationMessage, requestCompletion, streamCompletion } from '@api/modules/ai/client';
import { createJsonStream, eventsFromObject } from '@api/modules/ai/json-stream';
import { mockFixtureFor } from '@api/modules/ai/mock-fixtures';
import type {
  AiFailureReason,
  AiPurpose,
  AiResult,
  AiStreamItem,
  AiTool,
  StreamedRequest,
  StructuredRequest,
} from '@api/modules/ai/types';
import { z } from 'zod';

export type AiRunnerConfig =
  | { mode: 'live'; apiKey: string; model: string; fetch?: typeof fetch; log: Pick<Logger, 'warn'> }
  | { mode: 'mock'; log: Pick<Logger, 'warn'> };

const MAX_ATTEMPTS = 2;
// Every model call of one streamed request, tool rounds included, so a model that keeps asking for tools
// cannot loop forever.
const MAX_MODEL_CALLS = 4;
const MAX_TOOL_CALLS_PER_ROUND = 3;
const MAX_TOOL_RESULT_LENGTH = 6000;
const TOOL_CALLS_KEY = 'toolCalls';

// detail names where the answer was wrong (paths only, never values), so a log line can say why it failed.
type ParseResult<T> = { ok: true; data: T } | { ok: false; detail: string };

const ToolCallsSchema = z.array(z.object({ name: z.string(), arguments: z.unknown().optional() })).max(10);

function toolInstruction(tools: readonly AiTool[]) {
  const catalog = tools
    .map((tool) => {
      let shape = '{}';
      try {
        shape = JSON.stringify(z.toJSONSchema(tool.input, { unrepresentable: 'any' }));
      } catch {
        // The name and description still tell the model what the tool is for.
      }
      return `- ${tool.name} ${shape}: ${tool.description}`;
    })
    .join('\n');
  return (
    `\n\nBefore answering you may look things up. To do so, respond with ONLY {"${TOOL_CALLS_KEY}":[{"name":"<tool>","arguments":{...}}]} ` +
    `(at most ${MAX_TOOL_CALLS_PER_ROUND} calls) and nothing else; you will be given the results and then answer with the ` +
    `JSON object described above. Call a tool only when the answer needs it. Tools:\n${catalog}`
  );
}

function stripFence(content: string) {
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(content.trim());
  return match?.[1] ?? content;
}

function parseJson(content: string): unknown {
  try {
    return JSON.parse(stripFence(content));
  } catch {
    return undefined;
  }
}

async function runTools(tools: readonly AiTool[], calls: z.infer<typeof ToolCallsSchema>) {
  const results: string[] = [];
  for (const call of calls.slice(0, MAX_TOOL_CALLS_PER_ROUND)) {
    const tool = tools.find((candidate) => candidate.name === call.name);
    if (!tool) {
      results.push(`${call.name}: error, no such tool`);
      continue;
    }
    const args = tool.input.safeParse(call.arguments ?? {});
    if (!args.success) {
      results.push(`${call.name}: error, invalid arguments`);
      continue;
    }
    try {
      const output = await tool.run(args.data);
      results.push(`${call.name}: ${output.slice(0, MAX_TOOL_RESULT_LENGTH)}`);
    } catch {
      results.push(`${call.name}: error, lookup failed`);
    }
  }
  return results.join('\n\n');
}

function schemaInstruction(schema: z.ZodType) {
  try {
    const jsonSchema = z.toJSONSchema(schema, { unrepresentable: 'any' });
    return `\n\nRespond with a single JSON object, no prose, matching this JSON Schema:\n${JSON.stringify(jsonSchema)}`;
  } catch {
    return '\n\nRespond with a single JSON object and no prose.';
  }
}

// Some free models wrap JSON mode output in a markdown fence even when asked not to.
function stripCodeFence(content: string) {
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(content.trim());
  return match?.[1] ?? content;
}

function parseOutput<T>(content: string, schema: z.ZodType<T>): ParseResult<T> {
  let json: unknown;
  try {
    json = JSON.parse(stripCodeFence(content));
  } catch {
    return { ok: false, detail: 'not_json' };
  }
  const parsed = schema.safeParse(json);
  if (parsed.success) return { ok: true, data: parsed.data };
  const paths = parsed.error.issues.slice(0, 3).map((issue) => issue.path.join('.') || '(root)');
  return { ok: false, detail: `schema:${paths.join(',')}` };
}

export function createAiRunner(config: AiRunnerConfig) {
  function fail<T>(purpose: AiPurpose, reason: AiFailureReason, cause?: string): AiResult<T> {
    config.log.warn(cause ? { purpose, reason, cause } : { purpose, reason }, 'ai call failed');
    return { ok: false, reason };
  }

  function runMock<T>({ purpose, schema }: StructuredRequest<T>): AiResult<T> {
    const parsed = schema.safeParse(mockFixtureFor(purpose));
    return parsed.success ? { ok: true, data: parsed.data } : fail(purpose, 'invalid_output');
  }

  async function runLive<T>(request: StructuredRequest<T>, apiKey: string, model: string, doFetch?: typeof fetch) {
    const system = request.system + schemaInstruction(request.schema);

    let lastDetail: string | undefined;
    // Only an unparseable or schema-invalid answer is retried; a transport failure is reported at once.
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const completion = await requestCompletion({ apiKey, model, fetch: doFetch }, { system, user: request.user });
      if (!completion.ok) return fail<T>(request.purpose, 'unavailable', completion.cause);

      const parsed = parseOutput(completion.content, request.schema);
      if (parsed.ok) return { ok: true as const, data: parsed.data };
      lastDetail = parsed.detail;
    }
    return fail<T>(request.purpose, 'invalid_output', lastDetail);
  }

  // Streams the answer's top-level keys and array items as they arrive. A turn whose first key is toolCalls is
  // a lookup, not an answer: its events are held back, the tools run, and the model is asked again with the
  // results. Once an answer has started reaching the caller it is never retried, since the caller already
  // acted on part of it.
  async function* streamLive<T>(
    request: StreamedRequest<T>,
    apiKey: string,
    model: string,
    doFetch?: typeof fetch,
  ): AsyncGenerator<AiStreamItem<T>> {
    const tools = request.tools ?? [];
    const system =
      request.system +
      schemaInstruction(request.instructionSchema ?? request.schema) +
      (tools.length > 0 ? toolInstruction(tools) : '');
    const messages: ConversationMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: request.user },
    ];
    let hasForwarded = false;
    let parseFailures = 0;
    let lastDetail: string | undefined;
    // A key the schema does not know is noise from the model: it is never forwarded, so it cannot count as an
    // answer that has started.
    const knownKeys = request.schema instanceof z.ZodObject ? new Set(Object.keys(request.schema.shape)) : null;

    for (let call = 1; call <= MAX_MODEL_CALLS; call++) {
      const parser = createJsonStream();
      const stream = streamCompletion({ apiKey, model, fetch: doFetch }, messages);
      let content = '';
      let firstKey: string | null = null;
      const completed: Record<string, unknown> = {};

      let step = await stream.next();
      while (!step.done) {
        content += step.value;
        for (const event of parser.push(step.value)) {
          if (firstKey === null && event.type === 'key') firstKey = event.key;
          if (firstKey === TOOL_CALLS_KEY || event.key === TOOL_CALLS_KEY) continue;
          if (knownKeys && !knownKeys.has(event.key)) continue;
          if (event.type === 'value') completed[event.key] = event.value;
          if (event.type !== 'key') hasForwarded = true;
          yield { type: 'event', event };
        }
        step = await stream.next();
      }
      if (!step.value.ok) {
        yield { type: 'result', result: fail<T>(request.purpose, 'unavailable', step.value.cause) };
        return;
      }

      const json = parseJson(content);
      const calls = ToolCallsSchema.safeParse((json as Record<string, unknown> | undefined)?.[TOOL_CALLS_KEY]);
      if (calls.success && calls.data.length > 0) {
        const hasToolsLeft = tools.length > 0 && call < MAX_MODEL_CALLS;
        messages.push({ role: 'assistant', content });
        messages.push({
          role: 'user',
          content: hasToolsLeft
            ? `Tool results:\n${await runTools(tools, calls.data)}\n\nNow answer with the JSON object described above.`
            : 'No more lookups are available. Answer now with the JSON object described above.',
        });
        continue;
      }

      const parsed = parseOutput(content, request.schema);
      if (parsed.ok) {
        yield { type: 'result', result: { ok: true, data: parsed.data } };
        return;
      }
      lastDetail = parsed.detail;

      // A model that stops mid-answer (a length cutoff) leaves a text that is not valid JSON, but whatever
      // completed before the cut was already forwarded. When that is enough to satisfy the schema, the member
      // keeps it instead of an error.
      if (hasForwarded) {
        const salvaged = request.schema.safeParse(completed);
        if (salvaged.success) {
          config.log.warn({ purpose: request.purpose, cause: lastDetail }, 'ai answer salvaged from a cut-off reply');
          yield { type: 'result', result: { ok: true, data: salvaged.data } };
          return;
        }
      }
      if (hasForwarded || parseFailures >= MAX_ATTEMPTS - 1) break;
      parseFailures += 1;
    }
    yield { type: 'result', result: fail<T>(request.purpose, 'invalid_output', lastDetail) };
  }

  async function* streamMock<T>(request: StreamedRequest<T>): AsyncGenerator<AiStreamItem<T>> {
    const fixture = mockFixtureFor(request.purpose);
    if (typeof fixture === 'object' && fixture !== null) {
      for (const event of eventsFromObject(fixture as Record<string, unknown>)) yield { type: 'event', event };
    }
    yield { type: 'result', result: runMock(request) };
  }

  return {
    async *streamStructured<T>(request: StreamedRequest<T>): AsyncGenerator<AiStreamItem<T>> {
      try {
        if (config.mode === 'mock') yield* streamMock(request);
        else yield* streamLive(request, config.apiKey, config.model, config.fetch);
      } catch {
        yield { type: 'result', result: fail<T>(request.purpose, 'unavailable') };
      }
    },

    async runStructured<T>(request: StructuredRequest<T>): Promise<AiResult<T>> {
      try {
        if (config.mode === 'mock') return runMock(request);
        return await runLive(request, config.apiKey, config.model, config.fetch);
      } catch {
        // A caller's schema refinement can throw; the contract is still a result, never an exception.
        return fail(request.purpose, 'unavailable');
      }
    },
  };
}

export type AiRunner = ReturnType<typeof createAiRunner>;
