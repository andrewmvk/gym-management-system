import type { ProfileEvent, TrainingPlan, TrainingPlanExercise } from '@api/db/schema';
import { todayLocal } from '@api/lib/dates';
import { type AiResult, runStructured } from '@api/modules/ai';
import { findUserById } from '@api/modules/auth/repository';
import { listExercises } from '@api/modules/catalog/service';
import * as repository from '@api/modules/chat/repository';
import { findSubmissionsByUserId } from '@api/modules/onboarding/repository';
import * as plansRepository from '@api/modules/plans/repository';
import { generateForDate, getToday, getTodayAggregate, type PlanAggregate } from '@api/modules/plans/service';
import { type ChatResponse, ChatResponseSchema } from '@cadence/shared/schemas/profile-events';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const RECENT_EVENTS_LIMIT = 50;
const SOURCE_MESSAGE_EXCERPT_LENGTH = 200;

function computeAge(birthdate: string | null): number | null {
  if (!birthdate) return null;
  const birth = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

// One line, counted by event type - "compact" per this prompt's own wording, not a per-event digest.
export function summarizeOlderEvents(events: readonly ProfileEvent[]): string | null {
  if (events.length === 0) return null;
  const counts = new Map<string, number>();
  for (const event of events) counts.set(event.eventType, (counts.get(event.eventType) ?? 0) + 1);
  const byType = [...counts.entries()].map(([type, count]) => `${count} ${type}`).join(', ');
  return `${events.length} older events not shown in detail: ${byType}.`;
}

// No "resolved"/expiry concept exists on f_profile_events (docs/05-data-model.md), so "active" means
// reported and still within the recent-events window, not a separately tracked status.
const ACTIVE_HEALTH_EVENT_TYPES = new Set(['injury', 'medication_change']);

export interface ChatContext {
  ageYears: number | null;
  gender: string | null;
  onboardingSubmissions: Awaited<ReturnType<typeof findSubmissionsByUserId>>;
  recentEvents: ProfileEvent[];
  activeHealthEvents: ProfileEvent[];
  olderEventsSummary: string | null;
  todayPlan: Awaited<ReturnType<typeof getToday>>;
  availableExercises: { id: string; name: string; muscleGroup: string }[];
  aggregate: PlanAggregate;
}

async function assembleChatContext(userId: string): Promise<ChatContext> {
  const [user, onboardingSubmissions, allEvents, todayPlan, catalog, aggregate] = await Promise.all([
    findUserById(userId),
    findSubmissionsByUserId(userId),
    plansRepository.findProfileEventsByUserId(userId),
    getToday(userId),
    listExercises(),
    getTodayAggregate(),
  ]);
  const recentEvents = allEvents.slice(0, RECENT_EVENTS_LIMIT);

  return {
    ageYears: computeAge(user?.birthdate ?? null),
    gender: user?.gender ?? null,
    onboardingSubmissions,
    recentEvents,
    activeHealthEvents: recentEvents.filter((event) => ACTIVE_HEALTH_EVENT_TYPES.has(event.eventType)),
    olderEventsSummary: summarizeOlderEvents(allEvents.slice(RECENT_EVENTS_LIMIT)),
    todayPlan,
    availableExercises: catalog.filter((exercise) => exercise.isAvailable),
    aggregate,
  };
}

function buildAggregateLines(aggregate: PlanAggregate): string[] {
  const lines: string[] = [];
  lines.push(
    "Today's aggregate across all members (anonymized, no member identity) - use this only if asked what other members are doing:",
  );
  lines.push(
    aggregate.topExercises.length > 0
      ? `- Top exercises: ${aggregate.topExercises.map((e) => `${e.name} (${e.count})`).join(', ')}`
      : '- Top exercises: none yet',
  );
  lines.push(
    aggregate.topMuscleGroups.length > 0
      ? `- Top muscle groups: ${aggregate.topMuscleGroups.map((g) => `${g.name} (${g.count})`).join(', ')}`
      : '- Top muscle groups: none yet',
  );
  return lines;
}

// FR-25: assembled fresh on every call, never from a stored conversation - AGENTS.md principle 2, the
// AI reasons from these accumulated facts, never a raw transcript.
export function buildChatUserPrompt(context: ChatContext, message: string): string {
  const lines: string[] = [];
  lines.push(context.ageYears !== null ? `Member age: ${context.ageYears}` : 'Member age: unknown');
  lines.push(`Member gender: ${context.gender ?? 'unknown'}`);

  lines.push('Onboarding submissions (most recent first):');
  for (const submission of context.onboardingSubmissions) {
    const conditions = submission.physicalConditions.conditions.join(', ') || 'none';
    const otherNotes = submission.physicalConditions.otherNotes ? ` (${submission.physicalConditions.otherNotes})` : '';
    lines.push(`- Goals: ${submission.goals}`);
    lines.push(`  Medications: ${submission.medications.join(', ') || 'none'}`);
    lines.push(`  Conditions: ${conditions}${otherNotes}`);
  }

  if (context.todayPlan) {
    lines.push(`Today's plan (${context.todayPlan.status}):`);
    for (const exercise of context.todayPlan.exercises) {
      lines.push(
        `- ${exercise.exerciseName} (${exercise.sets}x${exercise.reps}${exercise.completed ? ', completed' : ''})`,
      );
    }
  } else {
    lines.push("Today's plan: none generated yet.");
  }

  // FR-28: placed right next to today's plan so a risk (e.g. an old knee injury) is easy to weigh
  // against today's actual exercises, rather than buried in the general history dump below.
  lines.push("Active injuries and medication changes (weigh these against today's plan above):");
  if (context.activeHealthEvents.length === 0) lines.push('- none reported');
  for (const event of context.activeHealthEvents) lines.push(`- ${event.eventType}: ${JSON.stringify(event.payload)}`);

  lines.push('Available exercise catalog - propose alternatives only from this list:');
  for (const exercise of context.availableExercises)
    lines.push(`- ${exercise.id} | ${exercise.name} | ${exercise.muscleGroup}`);

  lines.push('Profile history, most recent first:');
  if (context.recentEvents.length === 0) lines.push('- none yet');
  for (const event of context.recentEvents) {
    lines.push(`- ${event.eventType}: ${JSON.stringify(event.payload)}`);
  }
  if (context.olderEventsSummary) lines.push(context.olderEventsSummary);

  lines.push(...buildAggregateLines(context.aggregate));

  lines.push('Member message:');
  lines.push(message);

  return lines.join('\n');
}

// FR-25 to FR-29: this project's own wording, not a requirement quote.
const CHAT_SYSTEM_PROMPT =
  "You are a personal trainer AI assistant chatting with a gym member. Use the member's profile, " +
  "onboarding data, today's plan, and profile history to reply helpfully and safely. Extract any new, " +
  'durable facts the message reveals (injury, skipped exercise, medication change, life event, updated ' +
  'physical state, or a request to adjust their plan) as structured facts - never invent facts the ' +
  "message does not support. Weigh the member's active injuries and medication changes against today's " +
  'exercises: if one conflicts, warn about it and propose a safer alternative from the available ' +
  'catalog. Only mention the cross-member aggregate if the member asks about what others are doing.';

export type EvaluateChat = (contextPrompt: string) => Promise<AiResult<ChatResponse>>;

async function defaultEvaluateChat(contextPrompt: string): Promise<AiResult<ChatResponse>> {
  return runStructured({
    purpose: 'chat',
    system: CHAT_SYSTEM_PROMPT,
    user: contextPrompt,
    schema: ChatResponseSchema,
  });
}

export interface SendMessageOverrides {
  evaluateChat?: EvaluateChat;
}

export interface SendMessageResult {
  reply: string;
  factsSaved: number;
  adjustment?: ChatResponse['adjustment'];
}

export async function sendMessage(
  userId: string,
  message: string,
  overrides: SendMessageOverrides = {},
): Promise<SendMessageResult> {
  const context = await assembleChatContext(userId);
  const evaluateChat = overrides.evaluateChat ?? defaultEvaluateChat;
  const result = await evaluateChat(buildChatUserPrompt(context, message));
  if (!result.ok) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI is temporarily unavailable' });

  const sourceMessage = message.slice(0, SOURCE_MESSAGE_EXCERPT_LENGTH);
  await repository.insertProfileEvents(
    result.data.facts.map((fact) => ({ userId, eventType: fact.eventType, payload: fact.payload, sourceMessage })),
  );

  return { reply: result.data.reply, factsSaved: result.data.facts.length, adjustment: result.data.adjustment };
}

const PlanCorrectionExerciseSchema = z.object({
  exerciseId: z.uuid(),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
  load: z.string().optional(),
  notes: z.string().optional(),
  completed: z.boolean(),
});
const PlanCorrectionSchema = z.object({ exercises: z.array(PlanCorrectionExerciseSchema) });
type PlanCorrection = z.infer<typeof PlanCorrectionSchema>;

// FR-21/FR-23: this project's own wording, not a requirement quote.
const PLAN_CORRECTION_SYSTEM_PROMPT =
  "You are correcting a gym member's training plan for a past date based on what they say actually " +
  "happened, not generating a new one. You are given that date's current exercises and the available " +
  'exercise catalog. Return the full corrected exercise list - keep, remove, or replace exercises per the ' +
  "member's message, choosing exerciseId only from the catalog, and set completed accurately for every " +
  'exercise you return, including ones you keep unchanged.';

function buildCorrectionUserPrompt(
  currentExercises: readonly plansRepository.PlanExerciseDetail[],
  availableExercises: readonly { id: string; name: string; muscleGroup: string }[],
  aggregate: PlanAggregate,
  instruction: string,
): string {
  const lines: string[] = [];
  lines.push('Current exercises for this date:');
  if (currentExercises.length === 0) lines.push('- none');
  for (const exercise of currentExercises) {
    lines.push(
      `- ${exercise.exerciseId} | ${exercise.exerciseName} | sets ${exercise.sets} reps ${exercise.reps} | completed: ${exercise.completed}`,
    );
  }

  lines.push('Available exercise catalog - choose exerciseId only from this list:');
  for (const exercise of availableExercises)
    lines.push(`- ${exercise.id} | ${exercise.name} | ${exercise.muscleGroup}`);

  lines.push(...buildAggregateLines(aggregate));

  lines.push('Member correction request:');
  lines.push(instruction);

  return lines.join('\n');
}

export type EvaluateCorrection = (contextPrompt: string) => Promise<AiResult<PlanCorrection>>;

async function defaultEvaluateCorrection(contextPrompt: string): Promise<AiResult<PlanCorrection>> {
  return runStructured({
    purpose: 'chat',
    system: PLAN_CORRECTION_SYSTEM_PROMPT,
    user: contextPrompt,
    schema: PlanCorrectionSchema,
  });
}

export type AdjustPlanResult =
  | { status: 'ok'; plan: TrainingPlan & { exercises: TrainingPlanExercise[] } }
  | { status: 'needs_confirmation'; editedBy: string; editedAt: Date };

export interface AdjustPlanOverrides {
  evaluateCorrection?: EvaluateCorrection;
}

// FR-21/FR-23/RN-06/RN-07: today or a future date goes through the exact same regeneration guard as the
// member's own plan screen (P-13/P-15) - the instruction text itself doesn't feed into that path, since
// any fact chat.send already recorded in the same turn already shapes that regeneration's context. Only
// a past date needs a dedicated AI call, since regenerating history is meaningless - it asks the AI to
// return the corrected full exercise list (completed flags included) and writes it in place, keeping the
// same plan row (RN-07: no history table, the corrected version is the only version).
export async function adjustPlan(
  userId: string,
  date: string,
  instruction: string,
  confirmOverwrite = false,
  overrides: AdjustPlanOverrides = {},
): Promise<AdjustPlanResult> {
  if (date >= todayLocal()) {
    return generateForDate(userId, date, confirmOverwrite);
  }

  const existing = await plansRepository.findPlanByUserAndDate(userId, date);
  if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'No plan exists for that date' });

  if (existing.status === 'trainer_edited' && !confirmOverwrite) {
    const editor = existing.lastEditedByUserId ? await findUserById(existing.lastEditedByUserId) : null;
    return {
      status: 'needs_confirmation',
      editedBy: editor?.name ?? 'a trainer',
      editedAt: existing.lastEditedAt ?? existing.aiGeneratedAt ?? new Date(),
    };
  }

  const [currentExercises, catalog, aggregate] = await Promise.all([
    plansRepository.findExercisesForPlanWithDetails(existing.id),
    listExercises(),
    getTodayAggregate(),
  ]);
  const availableExercises = catalog.filter((exercise) => exercise.isAvailable);

  const evaluateCorrection = overrides.evaluateCorrection ?? defaultEvaluateCorrection;
  const result = await evaluateCorrection(
    buildCorrectionUserPrompt(currentExercises, availableExercises, aggregate, instruction),
  );
  if (!result.ok) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI is temporarily unavailable' });

  const availableIds = new Set(availableExercises.map((exercise) => exercise.id));
  const corrected = result.data.exercises.filter((exercise) => availableIds.has(exercise.exerciseId));
  const completedExerciseIds = new Set(
    corrected.filter((exercise) => exercise.completed).map((exercise) => exercise.exerciseId),
  );

  const exercisesInput: plansRepository.PlanExerciseInput[] = corrected.map(
    ({ exerciseId, sets, reps, load, notes }) => ({
      exerciseId,
      sets,
      reps,
      load,
      notes,
    }),
  );
  const plan = await plansRepository.replacePlan({ userId, planDate: date, exercises: exercisesInput });

  // replacePlan always inserts fresh rows with completed=false - reapply completed=true for whichever
  // corrected exercises the AI marked done, matching the new row ids replacePlan just created.
  await Promise.all(
    plan.exercises
      .filter((exercise) => completedExerciseIds.has(exercise.exerciseId))
      .map((exercise) => plansRepository.setExerciseCompleted(exercise.id, true)),
  );

  return {
    status: 'ok',
    plan: {
      ...plan,
      exercises: plan.exercises.map((exercise) =>
        completedExerciseIds.has(exercise.exerciseId) ? { ...exercise, completed: true } : exercise,
      ),
    },
  };
}
