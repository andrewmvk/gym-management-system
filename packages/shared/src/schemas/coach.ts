import { ExerciseMuscleSchema, MuscleGroupIdSchema, MuscleIdSchema } from '@shared/schemas/muscles';
import { ProfileEventFactSchema } from '@shared/schemas/profile-events';
import { z } from 'zod';

export const DRAFT_MAX_EXERCISES = 20;
export const MEMORY_NOTE_MAX = 300;
export const COACH_MAX_MENTIONS = 8;

export const WEIGHT_KG_MAX = 1000;
// A weight is always a number of kilograms: the screens add the unit, so nothing else can be typed in.
export const WeightKgSchema = z.number().min(0).max(WEIGHT_KG_MAX);

export const DraftExerciseSchema = z.object({
  exerciseId: z.uuid(),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(100),
  load: WeightKgSchema.nullish(),
  notes: z.string().trim().max(500).nullish(),
  // Only a correction to a past day sets it; for today or later the plan keeps the member's own ticks.
  completed: z.boolean().nullish(),
});
export type DraftExercise = z.infer<typeof DraftExerciseSchema>;

// The member's own edit of the numbers on one exercise of a plan.
export const UpdateExerciseInputSchema = z.object({
  planExerciseId: z.uuid(),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(100),
  load: WeightKgSchema.nullish(),
});
export type UpdateExerciseInput = z.infer<typeof UpdateExerciseInputSchema>;

export const MentionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('exercise'), exerciseId: z.uuid() }),
  z.object({ type: z.literal('muscle'), muscle: MuscleIdSchema }),
  z.object({ type: z.literal('group'), group: MuscleGroupIdSchema }),
  // The whole muscle distribution of the plan the member is looking at.
  z.object({ type: z.literal('distribution') }),
]);
export type Mention = z.infer<typeof MentionSchema>;

// The proposal the member is looking at, sent back with every message so the server stays stateless.
export const CoachDraftSchema = z.object({
  date: z.iso.date(),
  exercises: z.array(DraftExerciseSchema).max(DRAFT_MAX_EXERCISES),
  // What would be remembered if the member applied it now, so a revision can build on it.
  memoryNote: z.string().max(MEMORY_NOTE_MAX).nullish(),
});
export type CoachDraft = z.infer<typeof CoachDraftSchema>;

export const COACH_HISTORY_TURNS = 8;
const HISTORY_TEXT_MAX = 1500;

// What was said earlier in this chat, held by the browser and sent along because the server keeps no
// conversation. An assistant turn includes a one-line summary of each component it showed, so "add that"
// still has something to refer to.
export const HistoryTurnSchema = z.object({
  role: z.enum(['member', 'assistant']),
  text: z.string().trim().min(1).max(HISTORY_TEXT_MAX),
});
export type HistoryTurn = z.infer<typeof HistoryTurnSchema>;

export const CoachSendInputSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  mentions: z.array(MentionSchema).max(COACH_MAX_MENTIONS).default([]),
  draft: CoachDraftSchema.optional(),
  // The day of the plan the member has on screen. Without a draft it is the plan the coach talks about, so
  // pointing at an exercise or the muscle distribution of a day ahead is read against that day, not today.
  date: z.iso.date().optional(),
  history: z.array(HistoryTurnSchema).max(COACH_HISTORY_TURNS).default([]),
});
export type CoachSendInput = z.infer<typeof CoachSendInputSchema>;

// What the model writes. The shapes are deliberately forgiving: a model that writes a long sentence, an
// out-of-range number or an id that is not a uuid must not sink the whole reply. The server clamps what it
// can and drops what it cannot use, one component at a time. Every optional key can be null, because models
// fill an unused key with null.
const ReasonSchema = z.string().trim().min(1);

const AiProposalExerciseSchema = z.object({
  exerciseId: z.string(),
  // A model sometimes writes a number as text.
  sets: z.coerce.number(),
  reps: z.coerce.number(),
  // Kilograms. A model sometimes writes "20 kg" or "20", so both are read.
  load: z.union([z.number(), z.string()]).nullish(),
  notes: z.string().nullish(),
  completed: z.boolean().nullish(),
  reason: z.string().nullish(),
});

const AiProposalWarningSchema = z.object({ exerciseId: z.string(), reason: ReasonSchema });

// Shown to the model so it knows the shape it should write.
const AiProposalSchema = z.object({
  date: z.string(),
  summary: ReasonSchema,
  // What is remembered about this plan once the member applies it: what they asked and any detail that matters.
  memory: z.string().nullish(),
  exercises: z.array(AiProposalExerciseSchema),
  warnings: z.array(AiProposalWarningSchema).nullish(),
});

// Each item is judged on its own: an exercise or a warning that does not fit is left out, and a missing date or
// summary falls back to the plan being discussed, so one slip never turns a whole proposal into a silent nothing.
function leniently<T extends z.ZodType>(item: T) {
  return (value: unknown[]) =>
    value.flatMap((entry) => {
      const parsed = item.safeParse(entry);
      return parsed.success ? [parsed.data as z.output<T>] : [];
    });
}

const AiProposalReadSchema = z.object({
  date: z.string().nullish(),
  summary: z.string().nullish(),
  memory: z.string().nullish(),
  exercises: z.array(z.unknown()).transform(leniently(AiProposalExerciseSchema)),
  warnings: z
    .array(z.unknown())
    .nullish()
    .transform((value) => leniently(AiProposalWarningSchema)(value ?? [])),
});
export type AiProposal = z.output<typeof AiProposalReadSchema>;

const AiPickerSchema = z.object({
  muscle: MuscleIdSchema,
  options: z.array(
    z.object({
      exerciseId: z.string(),
      sets: z.number(),
      reps: z.number(),
      load: z.union([z.number(), z.string()]).nullish(),
      reason: ReasonSchema,
    }),
  ),
});
export type AiPicker = z.infer<typeof AiPickerSchema>;

const AiExplainerSchema = z.object({
  exerciseId: z.string(),
  summary: ReasonSchema,
  technique: z.array(z.string()).nullish(),
  benefits: z.array(z.string()).nullish(),
  mistakes: z.array(z.string()).nullish(),
  personalNote: z.string().nullish(),
});
export type AiExplainer = z.infer<typeof AiExplainerSchema>;

const AiSafetySchema = z.object({
  exerciseId: z.string(),
  reason: ReasonSchema,
  alternativeExerciseIds: z.array(z.string()).nullish(),
});
export type AiSafety = z.infer<typeof AiSafetySchema>;

// Shown to the model so it knows the shape it should write.
export const CoachAiResponseSchema = z.object({
  reply: z.string(),
  facts: z.array(ProfileEventFactSchema).nullish(),
  planProposal: AiProposalSchema.nullish(),
  exercisePicker: AiPickerSchema.nullish(),
  exerciseExplainer: AiExplainerSchema.nullish(),
  safetyWarning: AiSafetySchema.nullish(),
  quickReplies: z.array(z.string()).nullish(),
});
export type CoachAiResponse = z.infer<typeof CoachAiResponseSchema>;

// What the server accepts: only a reply is required, and each component is checked on its own afterwards, so
// one malformed component is dropped instead of failing the answer.
export const CoachAiEnvelopeSchema = z.object({
  reply: z.string().nullish(),
  facts: z.unknown().optional(),
  planProposal: z.unknown().optional(),
  exercisePicker: z.unknown().optional(),
  exerciseExplainer: z.unknown().optional(),
  safetyWarning: z.unknown().optional(),
  quickReplies: z.unknown().optional(),
});
export type CoachAiEnvelope = z.infer<typeof CoachAiEnvelopeSchema>;

export const AI_RESPONSE_PARTS = {
  planProposal: AiProposalReadSchema,
  exercisePicker: AiPickerSchema,
  exerciseExplainer: AiExplainerSchema,
  safetyWarning: AiSafetySchema,
  quickReplies: z.array(z.string()),
} as const;

const ExerciseRefSchema = z.object({
  exerciseId: z.uuid(),
  name: z.string(),
  muscles: z.array(ExerciseMuscleSchema),
});

const ExerciseNumbersSchema = z.object({
  sets: z.number().int(),
  reps: z.number().int(),
  load: z.number().nullable(),
});

export const SafetyWarningSchema = z.object({
  exerciseId: z.uuid(),
  reason: z.string(),
  // injury: computed from the member's reported injuries; coach: the AI's own judgement.
  source: z.enum(['injury', 'coach']),
});
export type SafetyWarning = z.infer<typeof SafetyWarningSchema>;

export const BeforeRowSchema = ExerciseRefSchema.extend(ExerciseNumbersSchema.shape);
export type BeforeRow = z.infer<typeof BeforeRowSchema>;

export const ProposalRowSchema = ExerciseRefSchema.extend(ExerciseNumbersSchema.shape).extend({
  notes: z.string().nullable(),
  completed: z.boolean().nullable(),
  reason: z.string().nullable(),
});
export type ProposalRow = z.infer<typeof ProposalRowSchema>;

export const PickerOptionSchema = ExerciseRefSchema.extend({
  sets: z.number().int(),
  reps: z.number().int(),
  load: z.number().nullable(),
  reason: z.string(),
  warning: z.string().nullable(),
});
export type PickerOption = z.infer<typeof PickerOptionSchema>;

export const PendingFactSchema = z.object({
  id: z.uuid(),
  eventType: z.string(),
  label: z.string(),
  description: z.string(),
  muscles: z.array(MuscleIdSchema),
});
export type PendingFact = z.infer<typeof PendingFactSchema>;

export const CoachBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('plan_proposal'),
    id: z.uuid(),
    date: z.iso.date(),
    summary: z.string(),
    before: z.array(BeforeRowSchema),
    after: z.array(ProposalRowSchema),
    warnings: z.array(SafetyWarningSchema),
    // Saved to the member's history when they apply the proposal.
    memoryNote: z.string(),
  }),
  z.object({
    type: z.literal('exercise_picker'),
    id: z.uuid(),
    muscle: MuscleIdSchema,
    options: z.array(PickerOptionSchema),
  }),
  z.object({
    type: z.literal('exercise_explainer'),
    id: z.uuid(),
    exercise: ExerciseRefSchema,
    summary: z.string(),
    technique: z.array(z.string()),
    benefits: z.array(z.string()),
    mistakes: z.array(z.string()),
    personalNote: z.string().nullable(),
  }),
  z.object({
    type: z.literal('safety_warning'),
    id: z.uuid(),
    exercise: ExerciseRefSchema,
    reason: z.string(),
    alternatives: z.array(PickerOptionSchema),
  }),
  z.object({ type: z.literal('facts'), id: z.uuid(), facts: z.array(PendingFactSchema) }),
  z.object({ type: z.literal('quick_replies'), id: z.uuid(), replies: z.array(z.string()) }),
]);
export type CoachBlock = z.infer<typeof CoachBlockSchema>;
export type CoachBlockType = CoachBlock['type'];

export type CoachStreamEvent = { type: 'text'; delta: string } | { type: 'block'; block: CoachBlock };

export const CoachApplyInputSchema = z.object({
  date: z.iso.date(),
  request: z.string().trim().max(2000).default(''),
  // The short line remembered about this plan; the server writes its own when it is empty.
  memoryNote: z.string().trim().max(MEMORY_NOTE_MAX).default(''),
  exercises: z.array(DraftExerciseSchema).min(1).max(DRAFT_MAX_EXERCISES),
  acknowledgedWarnings: z
    .array(z.object({ exerciseId: z.uuid(), reason: z.string().max(280) }))
    .max(DRAFT_MAX_EXERCISES)
    .default([]),
  confirmOverwrite: z.boolean().default(false),
});
export type CoachApplyInput = z.infer<typeof CoachApplyInputSchema>;

export const ConfirmFactsInputSchema = z.object({
  facts: z
    .array(z.object({ id: z.uuid(), description: z.string().trim().min(1).max(500).optional() }))
    .min(1)
    .max(10),
});
export const DismissFactInputSchema = z.object({ id: z.uuid() });
