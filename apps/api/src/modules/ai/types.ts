import { z } from 'zod';

export const AI_PURPOSES = ['aptitude', 'certificate', 'plan', 'chat'] as const;
export type AiPurpose = (typeof AI_PURPOSES)[number];

export type MockVerdict = 'cleared' | 'not_cleared' | 'unavailable';

export type AiFailureReason = 'unavailable' | 'invalid_output';
export type AiResult<T> = { ok: true; data: T } | { ok: false; reason: AiFailureReason };

export interface StructuredRequest<T> {
  purpose: AiPurpose;
  system: string;
  user: string;
  schema: z.ZodType<T>;
}

// Output shape shared by the aptitude and certificate purposes; the mock fixtures follow it.
export const AiVerdictSchema = z.object({
  verdict: z.enum(['cleared', 'not_cleared']),
  notes: z.string(),
});
export type AiVerdict = z.infer<typeof AiVerdictSchema>;
