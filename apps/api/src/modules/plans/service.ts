import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { env } from '@api/config/env';
import type { ProfileEvent, TrainingPlan, TrainingPlanExercise } from '@api/db/schema';
import { localDateString, todayLocal } from '@api/lib/dates';
import { runStructured, type AiResult } from '@api/modules/ai';
import { findUserById } from '@api/modules/auth/repository';
import { listExercises } from '@api/modules/catalog/service';
import { findSubmissionsByUserId } from '@api/modules/onboarding/repository';
import * as repository from '@api/modules/plans/repository';
import type { PlanExerciseInput } from '@api/modules/plans/repository';

const RECENT_PLAN_WINDOW_DAYS = 14;
const PLACEHOLDER_SETS = 3;
const PLACEHOLDER_REPS = 10;
const PLACEHOLDER_MIN_EXERCISES = 3;
const PLACEHOLDER_MAX_EXERCISES = 5;

function daysAgoDateString(days: number, now = new Date()): string {
  const past = new Date(now);
  past.setDate(past.getDate() - days);
  return localDateString(past);
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

type AvailableExercise = { id: string; name: string; muscleGroup: string };

interface PlanContext {
  ageYears: number | null;
  onboardingSubmissions: Awaited<ReturnType<typeof findSubmissionsByUserId>>;
  profileEvents: ProfileEvent[];
  recentPlans: TrainingPlan[];
  availableExercises: AvailableExercise[];
}

async function assemblePlanContext(userId: string): Promise<PlanContext> {
  const [user, onboardingSubmissions, profileEvents, recentPlans, catalog] = await Promise.all([
    findUserById(userId),
    findSubmissionsByUserId(userId),
    repository.findProfileEventsByUserId(userId),
    repository.findRecentPlans(userId, daysAgoDateString(RECENT_PLAN_WINDOW_DAYS)),
    listExercises(),
  ]);

  return {
    ageYears: computeAge(user?.birthdate ?? null),
    onboardingSubmissions,
    profileEvents,
    recentPlans,
    availableExercises: catalog.filter((exercise) => exercise.isAvailable),
  };
}

// FR-15: the system/user prompt wording is this project's own product decision, not a requirement quote.
const PLAN_SYSTEM_PROMPT =
  "You are a personal trainer AI. Build today's training plan for a gym member using only the " +
  "provided exercise catalog and the member's profile, onboarding data, and history. Choose exercises " +
  'appropriate to their goals and physical conditions, avoiding anything they should not safely perform. ' +
  'Respond only with the chosen exercises.';

function buildPlanUserPrompt(context: PlanContext): string {
  const lines: string[] = [];
  lines.push(context.ageYears !== null ? `Member age: ${context.ageYears}` : 'Member age: unknown');

  lines.push('Onboarding submissions (most recent first):');
  for (const submission of context.onboardingSubmissions) {
    const conditions = submission.physicalConditions.conditions.join(', ') || 'none';
    const otherNotes = submission.physicalConditions.otherNotes ? ` (${submission.physicalConditions.otherNotes})` : '';
    lines.push(`- Goals: ${submission.goals}`);
    lines.push(`  Medications: ${submission.medications.join(', ') || 'none'}`);
    lines.push(`  Conditions: ${conditions}${otherNotes}`);
  }

  if (context.profileEvents.length > 0) {
    lines.push('Profile events:');
    for (const event of context.profileEvents) lines.push(`- ${event.eventType}: ${JSON.stringify(event.payload)}`);
  }

  if (context.recentPlans.length > 0) {
    lines.push(`Plan dates from the last ${RECENT_PLAN_WINDOW_DAYS} days: ${context.recentPlans.map((p) => p.planDate).join(', ')}`);
  }

  lines.push('Available exercise catalog - choose exerciseId only from this list:');
  for (const exercise of context.availableExercises) {
    lines.push(`- ${exercise.id} | ${exercise.name} | ${exercise.muscleGroup}`);
  }

  return lines.join('\n');
}

const PlanGenerationSchema = z.object({
  exercises: z.array(
    z.object({
      exerciseId: z.uuid(),
      sets: z.number().int().positive(),
      reps: z.number().int().positive(),
      load: z.string().optional(),
      notes: z.string().optional(),
    }),
  ),
});
type PlanGeneration = z.infer<typeof PlanGenerationSchema>;

export type EvaluatePlan = (contextPrompt: string) => Promise<AiResult<PlanGeneration>>;

async function defaultEvaluatePlan(contextPrompt: string): Promise<AiResult<PlanGeneration>> {
  return runStructured({ purpose: 'plan', system: PLAN_SYSTEM_PROMPT, user: contextPrompt, schema: PlanGenerationSchema });
}

export type PlanGeneratorMode = 'ai' | 'placeholder';

// Unset defaults to placeholder only when AI_MODE is mock (the AI module's own plan fixture is always
// empty in mock mode, see ai/mock-fixtures.ts) - otherwise "ai" for the real integration.
function effectivePlanGenerator(): PlanGeneratorMode {
  return env.PLAN_GENERATOR ?? (env.AI_MODE === 'mock' ? 'placeholder' : 'ai');
}

// Deterministic (no randomness): one exercise per muscle group, alphabetically, up to 5; topped up from
// already-used groups (still alphabetical) if fewer than 3 distinct groups have an available exercise.
function generatePlaceholderExercises(availableExercises: readonly AvailableExercise[]): PlanExerciseInput[] {
  const byMuscleGroup = new Map<string, AvailableExercise[]>();
  for (const exercise of availableExercises) {
    const list = byMuscleGroup.get(exercise.muscleGroup) ?? [];
    list.push(exercise);
    byMuscleGroup.set(exercise.muscleGroup, list);
  }
  for (const list of byMuscleGroup.values()) list.sort((a, b) => a.name.localeCompare(b.name));

  const muscleGroups = [...byMuscleGroup.keys()].sort();
  const picked: AvailableExercise[] = [];
  const pickedIds = new Set<string>();

  for (const group of muscleGroups) {
    if (picked.length >= PLACEHOLDER_MAX_EXERCISES) break;
    const candidate = byMuscleGroup.get(group)![0]!;
    picked.push(candidate);
    pickedIds.add(candidate.id);
  }

  topUp: for (const group of muscleGroups) {
    for (const exercise of byMuscleGroup.get(group)!) {
      if (picked.length >= PLACEHOLDER_MIN_EXERCISES) break topUp;
      if (!pickedIds.has(exercise.id)) {
        picked.push(exercise);
        pickedIds.add(exercise.id);
      }
    }
  }

  return picked.map((exercise) => ({ exerciseId: exercise.id, sets: PLACEHOLDER_SETS, reps: PLACEHOLDER_REPS }));
}

export interface GenerateForDateOverrides {
  evaluatePlan?: EvaluatePlan;
  generator?: PlanGeneratorMode;
}

export type GenerateForDateResult =
  | { status: 'ok'; plan: TrainingPlan & { exercises: TrainingPlanExercise[] } }
  | { status: 'needs_confirmation'; editedBy: string; editedAt: Date };

// FR-15/FR-18: publishes immediately, no trainer approval step. RN-06/FR-22 (completed in P-15): a
// trainer_edited plan without confirmOverwrite is a normal, expected outcome - data, not a thrown
// error - so a caller (the chat-triggered regeneration in P-17) can show the member a warning and ask
// them to confirm, rather than catching an exception.
export async function generateForDate(
  userId: string,
  planDate: string,
  confirmOverwrite = false,
  overrides: GenerateForDateOverrides = {},
): Promise<GenerateForDateResult> {
  const existing = await repository.findPlanByUserAndDate(userId, planDate);
  if (existing?.status === 'trainer_edited' && !confirmOverwrite) {
    const editor = existing.lastEditedByUserId ? await findUserById(existing.lastEditedByUserId) : null;
    return {
      status: 'needs_confirmation',
      editedBy: editor?.name ?? 'a trainer',
      editedAt: existing.lastEditedAt ?? existing.aiGeneratedAt ?? new Date(),
    };
  }

  const context = await assemblePlanContext(userId);
  const availableIds = new Set(context.availableExercises.map((exercise) => exercise.id));
  const generator = overrides.generator ?? effectivePlanGenerator();

  let exercises: PlanExerciseInput[];
  if (generator === 'ai') {
    const evaluatePlan = overrides.evaluatePlan ?? defaultEvaluatePlan;
    const result = await evaluatePlan(buildPlanUserPrompt(context));
    if (!result.ok) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI is temporarily unavailable' });

    const valid = result.data.exercises.filter((exercise) => availableIds.has(exercise.exerciseId));
    exercises = valid.length > 0 ? valid : generatePlaceholderExercises(context.availableExercises);
  } else {
    exercises = generatePlaceholderExercises(context.availableExercises);
  }

  const plan = await repository.replacePlan({ userId, planDate, exercises });
  return { status: 'ok', plan };
}

export interface PlanExerciseView {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  instructions: string;
  sets: number;
  reps: number;
  load: string | null;
  notes: string | null;
  completed: boolean;
  orderIndex: number;
  isPerformable: boolean;
}

export interface PlanView {
  id: string;
  userId: string;
  planDate: string;
  status: TrainingPlan['status'];
  exercises: PlanExerciseView[];
}

// FR-17: isPerformable is computed fresh from the catalog's current availability on every read, never
// stored - toggling a piece of equipment changes what a plan shows without touching the plan itself.
async function toPlanView(plan: TrainingPlan): Promise<PlanView> {
  const [exercises, catalog] = await Promise.all([
    repository.findExercisesForPlanWithDetails(plan.id),
    listExercises(),
  ]);
  const availableById = new Map(catalog.map((exercise) => [exercise.id, exercise.isAvailable]));

  return {
    id: plan.id,
    userId: plan.userId,
    planDate: plan.planDate,
    status: plan.status,
    exercises: exercises.map((exercise) => ({
      id: exercise.id,
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      muscleGroup: exercise.muscleGroup,
      instructions: exercise.instructions,
      sets: exercise.sets,
      reps: exercise.reps,
      load: exercise.load,
      notes: exercise.notes,
      completed: exercise.completed,
      orderIndex: exercise.orderIndex,
      isPerformable: availableById.get(exercise.exerciseId) ?? false,
    })),
  };
}

export async function getPlanForDate(userId: string, planDate: string): Promise<PlanView | null> {
  const plan = await repository.findPlanByUserAndDate(userId, planDate);
  return plan ? toPlanView(plan) : null;
}

export async function getToday(userId: string): Promise<PlanView | null> {
  return getPlanForDate(userId, todayLocal());
}

export function listPlanDates(userId: string, from: string, to: string): Promise<string[]> {
  return repository.findPlanDatesInRange(userId, from, to);
}

// Thin wrapper so the router can resolve the real owner (never the caller's own claimed id) before
// deciding whether ctx.ability allows the write - assertCan stays the router's job either way.
export function getExerciseOwner(planExerciseId: string) {
  return repository.findExerciseOwner(planExerciseId);
}

export function markExerciseCompleted(planExerciseId: string, completed: boolean) {
  return repository.setExerciseCompleted(planExerciseId, completed);
}

const TOP_EXERCISES_LIMIT = 10;
const TOP_MUSCLE_GROUPS_LIMIT = 5;

export interface AggregateCount {
  name: string;
  count: number;
}

export interface PlanAggregate {
  topExercises: AggregateCount[];
  topMuscleGroups: AggregateCount[];
}

function topCounts(values: readonly string[], limit: number): AggregateCount[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name, count]) => ({ name, count }));
}

// FR-29: an anonymized cross-member summary for "what is everyone doing today" - the underlying query
// (findExercisesForDate) never selects a user id or name, so there is nothing to strip here, only to count.
export async function getTodayAggregate(): Promise<PlanAggregate> {
  const rows = await repository.findExercisesForDate(todayLocal());
  return {
    topExercises: topCounts(rows.map((row) => row.exerciseName), TOP_EXERCISES_LIMIT),
    topMuscleGroups: topCounts(rows.map((row) => row.muscleGroup), TOP_MUSCLE_GROUPS_LIMIT),
  };
}
