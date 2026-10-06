import type { JsonStreamEvent } from '@api/modules/ai/json-stream';
import type { z } from 'zod';

export const AI_PURPOSES = ['plan', 'chat'] as const;
export type AiPurpose = (typeof AI_PURPOSES)[number];

export type AiFailureReason = 'unavailable' | 'invalid_output';
export type AiResult<T> = { ok: true; data: T } | { ok: false; reason: AiFailureReason };

export interface StructuredRequest<T> {
  purpose: AiPurpose;
  system: string;
  user: string;
  schema: z.ZodType<T>;
}

// A read-only lookup the model may ask for before it answers. It is bound to the signed-in member when it
// is built, so the model can never name another member, and it only ever reads.
export interface AiTool {
  name: string;
  description: string;
  input: z.ZodType;
  run: (args: unknown) => Promise<string>;
}

export interface StreamedRequest<T> extends StructuredRequest<T> {
  tools?: readonly AiTool[];
  // The shape shown to the model, when it should be stricter than what is accepted back (schema).
  instructionSchema?: z.ZodType;
}

export type AiStreamItem<T> = { type: 'event'; event: JsonStreamEvent } | { type: 'result'; result: AiResult<T> };
