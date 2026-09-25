import { z } from 'zod';
import type { Logger } from '@api/lib/logger';
import { requestCompletion } from '@api/modules/ai/client';
import { mockFixtureFor, type MockSwitches } from '@api/modules/ai/mock-fixtures';
import type { AiFailureReason, AiPurpose, AiResult, StructuredRequest } from '@api/modules/ai/types';

export type AiRunnerConfig =
  | { mode: 'live'; apiKey: string; model: string; fetch?: typeof fetch; log: Pick<Logger, 'warn'> }
  | { mode: 'mock'; mock: MockSwitches; log: Pick<Logger, 'warn'> };

const MAX_ATTEMPTS = 2;

type ParseResult<T> = { ok: true; data: T } | { ok: false };

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
    return { ok: false };
  }
  const parsed = schema.safeParse(json);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false };
}

export function createAiRunner(config: AiRunnerConfig) {
  function fail<T>(purpose: AiPurpose, reason: AiFailureReason): AiResult<T> {
    config.log.warn({ purpose, reason }, 'ai call failed');
    return { ok: false, reason };
  }

  function runMock<T>({ purpose, schema }: StructuredRequest<T>, mock: MockSwitches): AiResult<T> {
    const fixture = mockFixtureFor(purpose, mock);
    if (fixture === null) return fail(purpose, 'unavailable');

    const parsed = schema.safeParse(fixture);
    return parsed.success ? { ok: true, data: parsed.data } : fail(purpose, 'invalid_output');
  }

  async function runLive<T>(request: StructuredRequest<T>, apiKey: string, model: string, doFetch?: typeof fetch) {
    const system = request.system + schemaInstruction(request.schema);

    // Only an unparseable or schema-invalid answer is retried; a transport failure is reported at once.
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const completion = await requestCompletion({ apiKey, model, fetch: doFetch }, { system, user: request.user });
      if (!completion.ok) return fail<T>(request.purpose, 'unavailable');

      const parsed = parseOutput(completion.content, request.schema);
      if (parsed.ok) return { ok: true as const, data: parsed.data };
    }
    return fail<T>(request.purpose, 'invalid_output');
  }

  return {
    async runStructured<T>(request: StructuredRequest<T>): Promise<AiResult<T>> {
      try {
        if (config.mode === 'mock') return runMock(request, config.mock);
        return await runLive(request, config.apiKey, config.model, config.fetch);
      } catch {
        // A caller's schema refinement can throw; the contract is still a result, never an exception.
        return fail(request.purpose, 'unavailable');
      }
    },
  };
}

export type AiRunner = ReturnType<typeof createAiRunner>;
