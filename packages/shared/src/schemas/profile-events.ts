import { z } from 'zod';

export const PROFILE_EVENT_TYPES = [
  'injury',
  'skipped_exercise',
  'medication_change',
  'life_event',
  'state_update',
  'plan_adjustment_request',
] as const;
export type ProfileEventType = (typeof PROFILE_EVENT_TYPES)[number];

// Uniform { description } payload for every event type: docs/05-data-model.md leaves the shape of
// f_profile_events.payload open, and P-16 doesn't need richer per-type fields - P-17/P-18, which would
// consume this more deeply, are out of scope here.
const FactPayloadSchema = z.object({ description: z.string().trim().min(1) });

export const ProfileEventFactSchema = z.discriminatedUnion('eventType', [
  z.object({ eventType: z.literal('injury'), payload: FactPayloadSchema }),
  z.object({ eventType: z.literal('skipped_exercise'), payload: FactPayloadSchema }),
  z.object({ eventType: z.literal('medication_change'), payload: FactPayloadSchema }),
  z.object({ eventType: z.literal('life_event'), payload: FactPayloadSchema }),
  z.object({ eventType: z.literal('state_update'), payload: FactPayloadSchema }),
  z.object({ eventType: z.literal('plan_adjustment_request'), payload: FactPayloadSchema }),
]);
export type ProfileEventFact = z.infer<typeof ProfileEventFactSchema>;

export const ChatSendInputSchema = z.object({ message: z.string().trim().min(1).max(2000) });
export type ChatSendInput = z.infer<typeof ChatSendInputSchema>;

// Placeholder shape only: P-16 accepts and forwards this field without acting on it. P-17 (chat plan
// adjustment) will define and consume its real shape.
const ChatAdjustmentSchema = z.object({ description: z.string() });

export const ChatResponseSchema = z.object({
  reply: z.string(),
  facts: z.array(ProfileEventFactSchema),
  adjustment: ChatAdjustmentSchema.optional(),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
