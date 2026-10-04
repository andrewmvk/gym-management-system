import { z } from 'zod';

export const PROFILE_EVENT_TYPES = [
  'injury',
  'skipped_exercise',
  'medication_change',
  'life_event',
  'state_update',
  'plan_adjustment_request',
  'muscle_focus_changed',
] as const;
export type ProfileEventType = (typeof PROFILE_EVENT_TYPES)[number];

// Uniform { description } payload for every event type: docs/05-data-model.md leaves the shape of
// f_profile_events.payload open, and P-16 doesn't need richer per-type fields - P-17/P-18, which would
// consume this more deeply, are out of scope here.
const FactPayloadSchema = z.object({ description: z.string().trim().min(1) });

export const PROFILE_EVENT_LABELS: Record<ProfileEventType, string> = {
  injury: 'Injury',
  skipped_exercise: 'Skipped exercise',
  medication_change: 'Medication change',
  life_event: 'Life event',
  state_update: 'Update',
  plan_adjustment_request: 'Plan request',
  muscle_focus_changed: 'Muscle focus',
};

// One short line for a remembered fact, e.g. "Injury: sore left knee". Falls back to the label alone when
// the stored payload does not match the expected shape, so a malformed row never breaks the list.
export function describeProfileEvent(eventType: ProfileEventType, payload: unknown): string {
  const label = PROFILE_EVENT_LABELS[eventType];
  const parsed = FactPayloadSchema.safeParse(payload);
  return parsed.success ? `${label}: ${parsed.data.description}` : label;
}

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

// P-17: enough for the chat panel's "Apply to my plan for <date>" button to call chat.adjustPlan
// directly with these two fields.
const ChatAdjustmentSchema = z.object({ date: z.iso.date(), instruction: z.string() });

export const ChatResponseSchema = z.object({
  reply: z.string(),
  facts: z.array(ProfileEventFactSchema),
  adjustment: ChatAdjustmentSchema.optional(),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
