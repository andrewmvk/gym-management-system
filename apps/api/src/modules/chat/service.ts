import { randomUUID } from 'node:crypto';
import { todayLocal } from '@api/lib/dates';
import { type AiResult, type AiStreamItem, type AiTool, streamStructured } from '@api/modules/ai';
import { listExercises } from '@api/modules/catalog/service';
import { buildExplainerBlock, buildPickerBlock, buildProposalBlock, buildSafetyBlock } from '@api/modules/chat/blocks';
import {
  assembleChatContext,
  buildChatUserPrompt,
  CHAT_SYSTEM_PROMPT,
  type ChatContext,
} from '@api/modules/chat/context';
import * as repository from '@api/modules/chat/repository';
import { buildChatTools } from '@api/modules/chat/tools';
import { setFocus } from '@api/modules/focus/service';
import * as plansRepository from '@api/modules/plans/repository';
import { checkOverwriteGuard, type NeedsConfirmation } from '@api/modules/plans/service';
import { listActiveInjuries } from '@api/modules/profile/service';
import {
  AI_RESPONSE_PARTS,
  type CoachAiEnvelope,
  CoachAiEnvelopeSchema,
  CoachAiResponseSchema,
  type CoachApplyInput,
  type CoachSendInput,
  type CoachStreamEvent,
  type PendingFact,
  type SafetyWarning,
} from '@cadence/shared/schemas/coach';
import { findInjuryConflicts } from '@cadence/shared/schemas/coach-draft';
import {
  injuryMuscles,
  PROFILE_EVENT_LABELS,
  type ProfileEventFact,
  ProfileEventFactSchema,
} from '@cadence/shared/schemas/profile-events';
import { TRPCError } from '@trpc/server';

const SOURCE_MESSAGE_EXCERPT_LENGTH = 200;
const UNAVAILABLE = { code: 'INTERNAL_SERVER_ERROR', message: 'AI is temporarily unavailable' } as const;

export { summarizeOlderEvents } from '@api/modules/chat/context';

export interface CoachStreamRequest {
  purpose: 'chat';
  system: string;
  user: string;
  schema: typeof CoachAiEnvelopeSchema;
  instructionSchema: typeof CoachAiResponseSchema;
  tools: AiTool[];
}

export type CoachStream = (request: CoachStreamRequest) => AsyncGenerator<AiStreamItem<CoachAiEnvelope>>;

const MAX_QUICK_REPLIES = 3;
const MAX_QUICK_REPLY_LENGTH = 60;

// Each fact and quick reply is judged on its own: one that does not fit is left out, the rest are kept.
function validFacts(value: unknown): ProfileEventFact[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = ProfileEventFactSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

function validQuickReplies(value: unknown): string[] {
  const parsed = AI_RESPONSE_PARTS.quickReplies.safeParse(value);
  if (!parsed.success) return [];
  return parsed.data
    .map((reply) => reply.trim().slice(0, MAX_QUICK_REPLY_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_QUICK_REPLIES);
}

export interface SendMessageOverrides {
  stream?: CoachStream;
}

function toPendingFact(event: { id: string }, fact: ProfileEventFact): PendingFact {
  return {
    id: event.id,
    eventType: fact.eventType,
    label: PROFILE_EVENT_LABELS[fact.eventType],
    description: fact.payload.description,
    muscles: fact.eventType === 'injury' ? injuryMuscles(fact.payload) : [],
  };
}

async function blockForPart(userId: string, key: keyof typeof AI_RESPONSE_PARTS, value: unknown, context: ChatContext) {
  switch (key) {
    case 'planProposal': {
      const parsed = AI_RESPONSE_PARTS.planProposal.safeParse(value);
      return parsed.success ? buildProposalBlock(userId, parsed.data, context) : null;
    }
    case 'exercisePicker': {
      const parsed = AI_RESPONSE_PARTS.exercisePicker.safeParse(value);
      return parsed.success ? buildPickerBlock(parsed.data, context) : null;
    }
    case 'exerciseExplainer': {
      const parsed = AI_RESPONSE_PARTS.exerciseExplainer.safeParse(value);
      return parsed.success ? buildExplainerBlock(parsed.data, context) : null;
    }
    case 'safetyWarning': {
      const parsed = AI_RESPONSE_PARTS.safetyWarning.safeParse(value);
      return parsed.success ? buildSafetyBlock(parsed.data, context) : null;
    }
    default:
      return null;
  }
}

const STREAMED_BLOCK_KEYS = ['planProposal', 'exercisePicker', 'exerciseExplainer', 'safetyWarning'] as const;

function defaultStream(request: CoachStreamRequest) {
  return streamStructured(request);
}

// FR-25: the reply streams as text, then each component the AI chose arrives as soon as it is complete and
// validated. The AI never writes anything: its facts are stored as pending (the member confirms them) and
// everything else is a proposal the member applies through applyDraft.
export async function* sendMessage(
  userId: string,
  input: CoachSendInput,
  overrides: SendMessageOverrides = {},
): AsyncGenerator<CoachStreamEvent> {
  const context = await assembleChatContext(userId, input);
  const stream = overrides.stream ?? defaultStream;

  const emitted = new Set<string>();
  let hasText = false;
  let result: AiResult<CoachAiEnvelope> | undefined;

  for await (const item of stream({
    purpose: 'chat',
    system: CHAT_SYSTEM_PROMPT,
    user: buildChatUserPrompt(context, input),
    schema: CoachAiEnvelopeSchema,
    instructionSchema: CoachAiResponseSchema,
    tools: buildChatTools(userId, context),
  })) {
    if (item.type === 'result') {
      result = item.result;
      break;
    }
    const { event } = item;
    if (event.type === 'delta' && event.key === 'reply') {
      hasText = true;
      yield { type: 'text', delta: event.text };
    } else if (event.type === 'value' && (STREAMED_BLOCK_KEYS as readonly string[]).includes(event.key)) {
      const key = event.key as (typeof STREAMED_BLOCK_KEYS)[number];
      const block = await blockForPart(userId, key, event.value, context);
      emitted.add(key);
      if (block) yield { type: 'block', block };
    }
  }
  if (!result?.ok) throw new TRPCError(UNAVAILABLE);
  const answer = result.data;

  if (!hasText && answer.reply) yield { type: 'text', delta: answer.reply };
  for (const key of STREAMED_BLOCK_KEYS) {
    if (emitted.has(key) || !answer[key]) continue;
    const block = await blockForPart(userId, key, answer[key], context);
    if (block) yield { type: 'block', block };
  }

  const facts = validFacts(answer.facts);
  if (facts.length > 0) {
    const sourceMessage = input.message.slice(0, SOURCE_MESSAGE_EXCERPT_LENGTH);
    const rows = await repository.insertPendingProfileEvents(
      facts.map((fact) => ({ userId, eventType: fact.eventType, payload: fact.payload, sourceMessage })),
    );
    yield {
      type: 'block',
      block: { type: 'facts', id: randomUUID(), facts: rows.map((row, index) => toPendingFact(row, facts[index]!)) },
    };
  }

  const quickReplies = validQuickReplies(answer.quickReplies);
  if (quickReplies.length > 0) {
    yield { type: 'block', block: { type: 'quick_replies', id: randomUUID(), replies: quickReplies } };
  }
}

export type ApplyDraftResult =
  | { status: 'ok'; plan: Awaited<ReturnType<typeof plansRepository.replacePlan>> }
  | NeedsConfirmation
  | { status: 'needs_acknowledgement'; warnings: SafetyWarning[] };

// The member's Apply: the only way a coach proposal reaches the database. The exercises are checked against
// the catalog and its availability again, injury warnings must have been acknowledged, and a trainer edit or
// ticked exercise still needs the member's confirmation (FR-22) before the plan is replaced.
export async function applyDraft(userId: string, input: CoachApplyInput): Promise<ApplyDraftResult> {
  const today = todayLocal();
  const isPast = input.date < today;
  const existing = await plansRepository.findPlanByUserAndDate(userId, input.date);
  if (isPast && !existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'No plan exists for that date' });

  const catalogById = new Map((await listExercises()).map((entry) => [entry.id, entry]));
  const ids = input.exercises.map((exercise) => exercise.exerciseId);
  const isValid = ids.every((id) => {
    const entry = catalogById.get(id);
    return entry && (isPast || entry.isAvailable);
  });
  if (!isValid || new Set(ids).size !== ids.length) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'The plan has an exercise that cannot be done right now' });
  }

  const injuries = await listActiveInjuries(userId);
  const conflicts = findInjuryConflicts(
    input.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      muscles: catalogById.get(exercise.exerciseId)!.muscles,
    })),
    injuries,
  );
  const acknowledgedIds = new Set(input.acknowledgedWarnings.map((warning) => warning.exerciseId));
  const unacknowledged = conflicts.filter((warning) => !acknowledgedIds.has(warning.exerciseId));
  if (unacknowledged.length > 0) return { status: 'needs_acknowledgement', warnings: unacknowledged };

  if (existing && !input.confirmOverwrite) {
    const guard = await checkOverwriteGuard(existing, { countCompleted: !isPast });
    if (guard) return guard;
  }

  const before = existing
    ? (await plansRepository.findExercisesForPlanWithDetails(existing.id)).map((row) => ({
        exerciseId: row.exerciseId,
        name: row.exerciseName,
        sets: row.sets,
        reps: row.reps,
        load: row.load,
      }))
    : [];

  const plan = await plansRepository.replacePlan({
    userId,
    planDate: input.date,
    exercises: input.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      sets: exercise.sets,
      reps: exercise.reps,
      load: exercise.load || undefined,
      notes: exercise.notes?.trim() || undefined,
      completed: isPast ? (exercise.completed ?? undefined) : undefined,
    })),
  });

  const nameOf = (id: string) => catalogById.get(id)?.name ?? 'Exercise';
  const conflictReason = new Map(conflicts.map((warning) => [warning.exerciseId, warning.reason]));
  await plansRepository.insertPlanChange({
    trainingPlanId: plan.id,
    userId,
    kind: 'coach',
    request: input.request || null,
    before,
    after: plan.exercises.map((row) => ({
      exerciseId: row.exerciseId,
      name: nameOf(row.exerciseId),
      sets: row.sets,
      reps: row.reps,
      load: row.load,
    })),
    acknowledgedWarnings: input.acknowledgedWarnings
      .filter((warning) => ids.includes(warning.exerciseId))
      .map((warning) => ({
        exerciseId: warning.exerciseId,
        name: nameOf(warning.exerciseId),
        reason: conflictReason.get(warning.exerciseId) ?? warning.reason,
      })),
  });

  for (const { muscle, bias } of input.focusChanges) await setFocus(userId, { muscle, bias });

  return { status: 'ok', plan };
}
