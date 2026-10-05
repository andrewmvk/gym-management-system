import { type MuscleId, MuscleIdSchema } from '@shared/schemas/muscles';
import { z } from 'zod';

export const PROFILE_EVENT_TYPES = [
  'injury',
  'skipped_exercise',
  'medication_change',
  'life_event',
  'state_update',
  'plan_adjustment_request',
  'muscle_focus_changed',
  'manual_plan_edit',
] as const;
export type ProfileEventType = (typeof PROFILE_EVENT_TYPES)[number];

// Uniform { description } payload for every event type: docs/05-data-model.md leaves the shape of
// f_profile_events.payload open. An injury also names the muscles it affects, so the body map can show it.
const FactPayloadSchema = z.object({ description: z.string().trim().min(1) });
const InjuryPayloadSchema = FactPayloadSchema.extend({ muscles: z.array(MuscleIdSchema).max(8).nullish() });

export const PROFILE_EVENT_LABELS: Record<ProfileEventType, string> = {
  injury: 'Injury',
  skipped_exercise: 'Skipped exercise',
  medication_change: 'Medication change',
  life_event: 'Life event',
  state_update: 'Update',
  plan_adjustment_request: 'Plan request',
  muscle_focus_changed: 'Muscle focus',
  manual_plan_edit: 'Manual edit',
};

// One short line for a remembered fact, e.g. "Injury: sore left knee". Falls back to the label alone when
// the stored payload does not match the expected shape, so a malformed row never breaks the list.
export function describeProfileEvent(eventType: ProfileEventType, payload: unknown): string {
  const label = PROFILE_EVENT_LABELS[eventType];
  const parsed = FactPayloadSchema.safeParse(payload);
  return parsed.success ? `${label}: ${parsed.data.description}` : label;
}

// The muscles a stored injury names, or none when the payload predates muscle tagging or is malformed.
export function injuryMuscles(payload: unknown): MuscleId[] {
  const parsed = InjuryPayloadSchema.safeParse(payload);
  return parsed.success ? [...new Set(parsed.data.muscles ?? [])] : [];
}

export const ProfileEventFactSchema = z.discriminatedUnion('eventType', [
  z.object({ eventType: z.literal('injury'), payload: InjuryPayloadSchema }),
  z.object({ eventType: z.literal('skipped_exercise'), payload: FactPayloadSchema }),
  z.object({ eventType: z.literal('medication_change'), payload: FactPayloadSchema }),
  z.object({ eventType: z.literal('life_event'), payload: FactPayloadSchema }),
  z.object({ eventType: z.literal('state_update'), payload: FactPayloadSchema }),
  z.object({ eventType: z.literal('plan_adjustment_request'), payload: FactPayloadSchema }),
]);
export type ProfileEventFact = z.infer<typeof ProfileEventFactSchema>;

export const FactCorrectionSchema = z.object({
  id: z.uuid(),
  description: z.string().trim().min(1).max(500),
});
