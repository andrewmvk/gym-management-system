import { ChatResponseSchema, type ChatResponse } from '@cadence/shared/schemas/profile-events';
import { TRPCError } from '@trpc/server';
import type { ProfileEvent } from '@api/db/schema';
import { runStructured, type AiResult } from '@api/modules/ai';
import { findUserById } from '@api/modules/auth/repository';
import * as repository from '@api/modules/chat/repository';
import { findSubmissionsByUserId } from '@api/modules/onboarding/repository';
import { findProfileEventsByUserId } from '@api/modules/plans/repository';
import { getToday } from '@api/modules/plans/service';

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

export interface ChatContext {
  ageYears: number | null;
  gender: string | null;
  onboardingSubmissions: Awaited<ReturnType<typeof findSubmissionsByUserId>>;
  recentEvents: ProfileEvent[];
  olderEventsSummary: string | null;
  todayPlan: Awaited<ReturnType<typeof getToday>>;
}

async function assembleChatContext(userId: string): Promise<ChatContext> {
  const [user, onboardingSubmissions, allEvents, todayPlan] = await Promise.all([
    findUserById(userId),
    findSubmissionsByUserId(userId),
    findProfileEventsByUserId(userId),
    getToday(userId),
  ]);

  return {
    ageYears: computeAge(user?.birthdate ?? null),
    gender: user?.gender ?? null,
    onboardingSubmissions,
    recentEvents: allEvents.slice(0, RECENT_EVENTS_LIMIT),
    olderEventsSummary: summarizeOlderEvents(allEvents.slice(RECENT_EVENTS_LIMIT)),
    todayPlan,
  };
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
      lines.push(`- ${exercise.exerciseName} (${exercise.sets}x${exercise.reps}${exercise.completed ? ', completed' : ''})`);
    }
  } else {
    lines.push("Today's plan: none generated yet.");
  }

  lines.push('Profile history, most recent first:');
  if (context.recentEvents.length === 0) lines.push('- none yet');
  for (const event of context.recentEvents) {
    lines.push(`- ${event.eventType}: ${JSON.stringify(event.payload)}`);
  }
  if (context.olderEventsSummary) lines.push(context.olderEventsSummary);

  lines.push('Member message:');
  lines.push(message);

  return lines.join('\n');
}

// FR-25 to FR-27: this project's own wording, not a requirement quote.
const CHAT_SYSTEM_PROMPT =
  "You are a personal trainer AI assistant chatting with a gym member. Use the member's profile, " +
  "onboarding data, today's plan, and profile history to reply helpfully and safely. Extract any new, " +
  'durable facts the message reveals (injury, skipped exercise, medication change, life event, updated ' +
  'physical state, or a request to adjust their plan) as structured facts - never invent facts the ' +
  'message does not support.';

export type EvaluateChat = (contextPrompt: string) => Promise<AiResult<ChatResponse>>;

async function defaultEvaluateChat(contextPrompt: string): Promise<AiResult<ChatResponse>> {
  return runStructured({ purpose: 'chat', system: CHAT_SYSTEM_PROMPT, user: contextPrompt, schema: ChatResponseSchema });
}

export interface SendMessageOverrides {
  evaluateChat?: EvaluateChat;
}

export interface SendMessageResult {
  reply: string;
  factsSaved: number;
  adjustment?: ChatResponse['adjustment'];
}

export async function sendMessage(userId: string, message: string, overrides: SendMessageOverrides = {}): Promise<SendMessageResult> {
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
