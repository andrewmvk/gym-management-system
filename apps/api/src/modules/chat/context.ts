import type { ProfileEvent } from '@api/db/schema';
import { todayLocal } from '@api/lib/dates';
import { findUserById } from '@api/modules/auth/repository';
import { listExercises } from '@api/modules/catalog/service';
import { findFocusByUserId } from '@api/modules/focus/repository';
import { findSubmissionsByUserId } from '@api/modules/onboarding/repository';
import * as plansRepository from '@api/modules/plans/repository';
import {
  type AvailableExercise,
  buildMuscleFocusLines,
  buildOnboardingLines,
  formatCatalogLine,
  getTodayAggregate,
  type PlanAggregate,
} from '@api/modules/plans/service';
import type { CoachDraft, CoachSendInput } from '@cadence/shared/schemas/coach';
import { findInjuryConflicts, type InjuryForConflicts } from '@cadence/shared/schemas/coach-draft';
import {
  type ExerciseMuscle,
  type MemberMuscleFocus,
  MUSCLES,
  type MuscleId,
  muscleLabel,
} from '@cadence/shared/schemas/muscles';
import { injuryMuscles } from '@cadence/shared/schemas/profile-events';

const RECENT_EVENTS_LIMIT = 50;
const MUSCLE_CANDIDATES_LIMIT = 12;

export type CatalogEntry = Awaited<ReturnType<typeof listExercises>>[number];

export interface PlanExerciseSnapshot {
  exerciseId: string;
  name: string;
  muscles: ExerciseMuscle[];
  sets: number;
  reps: number;
  load: number | null;
  notes: string | null;
  completed: boolean;
}

export interface DiscussedPlan {
  date: string;
  status: string | null;
  exercises: PlanExerciseSnapshot[];
}

export interface ChatContext {
  today: string;
  ageYears: number | null;
  gender: string | null;
  onboardingSubmissions: Awaited<ReturnType<typeof findSubmissionsByUserId>>;
  recentEvents: ProfileEvent[];
  activeHealthEvents: ProfileEvent[];
  olderEventsSummary: string | null;
  catalog: CatalogEntry[];
  availableExercises: AvailableExercise[];
  muscleFocus: MemberMuscleFocus[];
  aggregate: PlanAggregate;
  injuries: InjuryForConflicts[];
  planDate: string;
  storedPlan: DiscussedPlan;
  draft: DiscussedPlan | null;
  mentionedExercises: CatalogEntry[];
  mentionedMuscles: MuscleId[];
  muscleCandidates: AvailableExercise[];
}

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

// An injury or medication change stays active until the member resolves it, however old it is, so these
// types are always shown in detail and never folded into a count.
const ACTIVE_HEALTH_EVENT_TYPES = new Set(['injury', 'medication_change']);

// One line, counted by event type - "compact" per this prompt's own wording, not a per-event digest.
export function summarizeOlderEvents(events: readonly ProfileEvent[]): string | null {
  const foldable = events.filter((event) => !ACTIVE_HEALTH_EVENT_TYPES.has(event.eventType));
  if (foldable.length === 0) return null;
  const counts = new Map<string, number>();
  for (const event of foldable) counts.set(event.eventType, (counts.get(event.eventType) ?? 0) + 1);
  const byType = [...counts.entries()].map(([type, count]) => `${count} ${type}`).join(', ');
  return `${foldable.length} older events not shown in detail: ${byType}.`;
}

// The primary muscle first, then the muscles that only assist; an exercise already in the plan or one that
// an injury rules out is never offered.
export function buildMuscleCandidates(
  muscle: MuscleId,
  available: readonly AvailableExercise[],
  excludeIds: ReadonlySet<string>,
  injuries: readonly InjuryForConflicts[],
): AvailableExercise[] {
  const roleOf = (exercise: AvailableExercise) => exercise.muscles.find((entry) => entry.muscle === muscle)?.role;
  const blocked = new Set(
    findInjuryConflicts(
      available.map((exercise) => ({ exerciseId: exercise.id, muscles: exercise.muscles })),
      injuries,
    ).map((warning) => warning.exerciseId),
  );
  return available
    .filter((exercise) => roleOf(exercise) !== undefined && !excludeIds.has(exercise.id) && !blocked.has(exercise.id))
    .sort((a, b) => Number(roleOf(b) === 'primary') - Number(roleOf(a) === 'primary') || a.name.localeCompare(b.name))
    .slice(0, MUSCLE_CANDIDATES_LIMIT);
}

export async function loadStoredPlan(userId: string, date: string): Promise<DiscussedPlan> {
  const plan = await plansRepository.findPlanByUserAndDate(userId, date);
  if (!plan) return { date, status: null, exercises: [] };
  const rows = await plansRepository.findExercisesForPlanWithDetails(plan.id);
  return {
    date,
    status: plan.status,
    exercises: rows.map((row) => ({
      exerciseId: row.exerciseId,
      name: row.exerciseName,
      muscles: row.muscles,
      sets: row.sets,
      reps: row.reps,
      load: row.load,
      notes: row.notes,
      completed: row.completed,
    })),
  };
}

function draftSnapshot(draft: CoachDraft, catalog: readonly CatalogEntry[]): DiscussedPlan {
  const byId = new Map(catalog.map((exercise) => [exercise.id, exercise]));
  return {
    date: draft.date,
    status: null,
    exercises: draft.exercises.flatMap((exercise) => {
      const entry = byId.get(exercise.exerciseId);
      if (!entry) return [];
      return [
        {
          exerciseId: entry.id,
          name: entry.name,
          muscles: entry.muscles,
          sets: exercise.sets,
          reps: exercise.reps,
          load: exercise.load ?? null,
          notes: exercise.notes ?? null,
          completed: false,
        },
      ];
    }),
  };
}

export async function assembleChatContext(userId: string, input: CoachSendInput): Promise<ChatContext> {
  const today = todayLocal();
  const planDate = input.draft?.date ?? today;
  const [user, onboardingSubmissions, profileEvents, catalog, aggregate, muscleFocus] = await Promise.all([
    findUserById(userId),
    findSubmissionsByUserId(userId),
    plansRepository.findUnresolvedProfileEvents(userId),
    listExercises(),
    getTodayAggregate(),
    findFocusByUserId(userId),
  ]);
  const storedPlan = await loadStoredPlan(userId, planDate);
  const draft = input.draft ? draftSnapshot(input.draft, catalog) : null;

  // The focus block is the current truth; its change events would only repeat stale levels.
  const allEvents = profileEvents.filter((event) => event.eventType !== 'muscle_focus_changed');
  const injuries = allEvents
    .filter((event) => event.eventType === 'injury')
    .map((event) => ({
      description: String((event.payload as { description?: unknown } | null)?.description ?? 'injury'),
      muscles: injuryMuscles(event.payload),
    }));
  const availableExercises = catalog.filter((exercise) => exercise.isAvailable);

  const catalogById = new Map(catalog.map((exercise) => [exercise.id, exercise]));
  const mentionedExercises = input.mentions.flatMap((mention) =>
    mention.type === 'exercise' && catalogById.has(mention.exerciseId) ? [catalogById.get(mention.exerciseId)!] : [],
  );
  const mentionedMuscles = input.mentions.flatMap((mention) => (mention.type === 'muscle' ? [mention.muscle] : []));
  const inPlanIds = new Set((draft ?? storedPlan).exercises.map((exercise) => exercise.exerciseId));
  const muscleCandidates = mentionedMuscles[0]
    ? buildMuscleCandidates(mentionedMuscles[0], availableExercises, inPlanIds, injuries)
    : [];

  return {
    today,
    ageYears: computeAge(user?.birthdate ?? null),
    gender: user?.gender ?? null,
    onboardingSubmissions,
    recentEvents: allEvents.slice(0, RECENT_EVENTS_LIMIT),
    activeHealthEvents: allEvents.filter((event) => ACTIVE_HEALTH_EVENT_TYPES.has(event.eventType)),
    olderEventsSummary: summarizeOlderEvents(allEvents.slice(RECENT_EVENTS_LIMIT)),
    catalog,
    availableExercises,
    muscleFocus,
    aggregate,
    injuries,
    planDate,
    storedPlan,
    draft,
    mentionedExercises,
    mentionedMuscles,
    muscleCandidates,
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
    aggregate.topMuscles.length > 0
      ? `- Top muscles: ${aggregate.topMuscles.map((muscle) => `${muscle.name} (${muscle.count})`).join(', ')}`
      : '- Top muscles: none yet',
  );
  return lines;
}

function formatPlanLine(exercise: PlanExerciseSnapshot, showCompleted: boolean): string {
  const load = exercise.load ? ` ${exercise.load} kg` : '';
  const done = showCompleted && exercise.completed ? ', completed' : '';
  return `- ${exercise.exerciseId} | ${exercise.name} | ${exercise.sets}x${exercise.reps}${load}${done}`;
}

function buildMentionLines(context: ChatContext): string[] {
  if (context.mentionedExercises.length === 0 && context.mentionedMuscles.length === 0) return [];
  const lines = ['The member pointed at these in the app (they mean exactly these, not a similar one):'];
  for (const exercise of context.mentionedExercises) lines.push(`- exercise ${exercise.id} | ${exercise.name}`);
  for (const muscle of context.mentionedMuscles) lines.push(`- muscle ${muscle} | ${muscleLabel(muscle)}`);
  if (context.muscleCandidates.length > 0) {
    lines.push(
      `Candidate exercises for ${muscleLabel(context.mentionedMuscles[0]!)} that suit this member (if you offer an exercisePicker, choose only from these):`,
    );
    for (const exercise of context.muscleCandidates) lines.push(formatCatalogLine(exercise));
  }
  return lines;
}

// FR-25: assembled fresh on every call, never from a stored conversation - AGENTS.md principle 2, the
// AI reasons from these accumulated facts, never a raw transcript.
export function buildChatUserPrompt(
  context: ChatContext,
  input: Pick<CoachSendInput, 'message'> & Partial<Pick<CoachSendInput, 'history'>>,
): string {
  const lines: string[] = [];
  lines.push(`Today's date: ${context.today}`);
  lines.push(context.ageYears !== null ? `Member age: ${context.ageYears}` : 'Member age: unknown');
  lines.push(`Member gender: ${context.gender ?? 'unknown'}`);

  lines.push(...buildOnboardingLines(context.onboardingSubmissions));

  const { storedPlan } = context;
  if (storedPlan.exercises.length > 0) {
    lines.push(`Plan for ${storedPlan.date} as saved (${storedPlan.status}):`);
    for (const exercise of storedPlan.exercises) lines.push(formatPlanLine(exercise, true));
  } else {
    lines.push(`Plan for ${storedPlan.date}: none generated yet.`);
  }
  if (context.draft) {
    lines.push(
      `Draft the member is reviewing for ${context.draft.date} (not applied yet; when you revise it, return the full revised list as planProposal):`,
    );
    for (const exercise of context.draft.exercises) lines.push(formatPlanLine(exercise, false));
  }

  // FR-28: placed right next to the plan so a risk (e.g. an old knee injury) is easy to weigh against the
  // actual exercises, rather than buried in the general history dump below.
  lines.push('Active injuries and medication changes (weigh these against the plan above):');
  if (context.activeHealthEvents.length === 0) lines.push('- none reported');
  for (const event of context.activeHealthEvents) lines.push(`- ${event.eventType}: ${JSON.stringify(event.payload)}`);

  lines.push(...buildMuscleFocusLines(context.muscleFocus));
  lines.push(...buildMentionLines(context));

  lines.push('Available exercise catalog - propose exercises only from this list:');
  for (const exercise of context.availableExercises) lines.push(formatCatalogLine(exercise));

  lines.push('Profile history, most recent first:');
  if (context.recentEvents.length === 0) lines.push('- none yet');
  for (const event of context.recentEvents) {
    lines.push(`- ${event.eventType}: ${JSON.stringify(event.payload)}`);
  }
  if (context.olderEventsSummary) lines.push(context.olderEventsSummary);

  lines.push(...buildAggregateLines(context.aggregate));

  if (input.history && input.history.length > 0) {
    lines.push(
      'Earlier in this chat (this session only, oldest first). The member may be answering or pointing back at it; use it instead of asking them to repeat themselves:',
    );
    for (const turn of input.history) lines.push(`- ${turn.role === 'member' ? 'Member' : 'Coach'}: ${turn.text}`);
  }

  lines.push('Member message:');
  lines.push(input.message);

  return lines.join('\n');
}

const MUSCLE_REGISTRY = MUSCLES.map((muscle) => `${muscle.id} (${muscle.label})`).join(', ');

// FR-25 to FR-29: this project's own wording, not a requirement quote.
export const CHAT_SYSTEM_PROMPT =
  "You are the member's personal coach inside their gym app, speaking to them directly. Use their profile, " +
  'onboarding data, the plan, their profile history and what you can look up to answer helpfully and safely. ' +
  'Write the reply as short, plain text with no markdown; never put a list of exercises in the reply, use ' +
  'planProposal for that. Never ask the member in the reply whether they want something added, swapped or ' +
  'removed: show it as planProposal (or as an exercisePicker when you are offering choices, a single option ' +
  'is fine) so they can see exactly what changes and apply it with one tap. When the member answers an ' +
  'earlier offer with yes, add it, do it or similar, read the earlier conversation and return the planProposal ' +
  'for exactly that offer; do not ask what they mean when the conversation already says. ' +
  'Use the other keys only when they help: ' +
  'facts: new, durable facts the message reveals (injury, skipped exercise, medication change, life event, ' +
  'updated physical state, or a request to adjust their plan), never invented. For an injury also set ' +
  `payload.muscles to the muscle ids it affects, chosen only from: ${MUSCLE_REGISTRY}. ` +
  'planProposal: whenever the member wants their plan changed, or you propose a safer alternative. It is the ' +
  'FULL exercise list for that date after your change, not only the changes. Its date is the member plan date ' +
  'as YYYY-MM-DD: use the plan date given above unless the member names another day, and never a date in the ' +
  'past unless they are correcting a day that already happened (then set completed on every exercise). Give ' +
  'every changed or added exercise a one-line reason, and keep the rest as they were. Choose exerciseId only ' +
  'from the available catalog. If the member shows a draft, revise that draft. If they ask for more focus on ' +
  'a muscle, also set focusChanges (bias -2 much less to +2 much more) and build the plan around it. ' +
  'exercisePicker: when the member points at a muscle and wants exercises for it, offer 3 to 5 options chosen ' +
  'only from the candidate list, each with sets, reps and a one-line reason that mentions their goal, focus or ' +
  'limits. ' +
  'Weights: every planProposal exercise and every exercisePicker option that uses added weight needs a load, ' +
  'in kilograms as a plain number (20, not "20 kg"). Base it on the weights the member recently used (look at ' +
  'their workout history when you are unsure), the numbers they edited by hand, their body weight, goals and ' +
  'any injury. For an exercise they have not done before, start conservative and say so in the reason. Leave ' +
  'load out only for bodyweight exercises. ' +
  'exerciseExplainer: when asked how to do an exercise, what it is good for or how it fits them: a one-line ' +
  'summary, short technique cues, benefits and common mistakes, plus a personalNote tied to their injuries or ' +
  'goals when relevant. ' +
  'safetyWarning: when an exercise conflicts with an injury, medication or exam finding and no change was ' +
  'asked for; add safer alternatives from the catalog in alternativeExerciseIds. ' +
  'quickReplies: two or three short follow-ups the member is likely to send next. ' +
  "Weigh the member's active injuries, medication changes, medications and medical exam findings against the " +
  'exercises: if one conflicts, warn about it in planProposal.warnings and propose a safer alternative. ' +
  'Catalog exercises list the muscles they train as primary or secondary, and the member muscle focus says ' +
  'which muscles they want emphasized; respect it, but never above safety. Numbers the member edited by ' +
  'hand (history entries about manual edits) show what they could or could not do: respect them. Only ' +
  'mention the cross-member aggregate if the member asks about what others are doing.';
