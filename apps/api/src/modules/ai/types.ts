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
