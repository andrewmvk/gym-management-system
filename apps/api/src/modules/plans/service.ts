import { env } from '@api/config/env';
import type { OnboardingSubmission, ProfileEvent, TrainingPlan, TrainingPlanExercise } from '@api/db/schema';
import { localDateString, startOfLocalDay, todayLocal } from '@api/lib/dates';
import { type AiResult, runStructured } from '@api/modules/ai';
import { findUserById } from '@api/modules/auth/repository';
import { listExercises } from '@api/modules/catalog/service';
import { findFocusByUserId } from '@api/modules/focus/repository';
import { findCheckInTimes } from '@api/modules/metrics/repository';
import { findSubmissionsByUserId } from '@api/modules/onboarding/repository';
import type { DemandRow, MemberReviewRow, PlanExerciseInput, PlanHistoryRow } from '@api/modules/plans/repository';
import * as repository from '@api/modules/plans/repository';
import { computeMuscleLoad, type MuscleLoad, rankMuscles } from '@cadence/shared/schemas/muscle-heat';
import {
  type ExerciseMuscle,
  FOCUS_BIAS_LABELS,
  FOCUS_BIAS_MIN,
  type MemberMuscleFocus,
  MUSCLE_IDS,
  type MuscleId,
  muscleLabel,
} from '@cadence/shared/schemas/muscles';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

const RECENT_PLAN_WINDOW_DAYS = 14;
const TRAINER_NOTES_LIMIT = 5;
const DEMAND_EQUIPMENT_LIMIT = 10;
const DEMAND_MUSCLES_LIMIT = 8;
const PLACEHOLDER_SETS = 3;
const PLACEHOLDER_REPS = 10;
const PLACEHOLDER_MIN_EXERCISES = 3;
const PLACEHOLDER_MAX_EXERCISES = 5;

function shiftDate(date: string, days: number): string {
  const shifted = new Date(`${date}T12:00:00`);
  shifted.setDate(shifted.getDate() + days);
  return localDateString(shifted);
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

export type AvailableExercise = { id: string; name: string; muscles: readonly ExerciseMuscle[] };

export interface DemandCatalogEntry {
  id: string;
  muscles: readonly ExerciseMuscle[];
  equipment: readonly { id: string; name: string; isAvailable: boolean }[];
}

export interface PlanDemand {
  otherPlanCount: number;
  equipment: { id: string; name: string; planCount: number }[];
  muscleLoad: MuscleLoad;
}

// Counts PLANS, not exercise rows: a plan with two exercises on the same piece still needs it once.
// Only equipment currently running is listed, since the generator is never offered exercises that need
// a piece that is out of service.
export function computePlanDemand(rows: readonly DemandRow[], catalog: readonly DemandCatalogEntry[]): PlanDemand {
  const byExercise = new Map(catalog.map((exercise) => [exercise.id, exercise]));
  const plansPerEquipment = new Map<string, { name: string; plans: Set<string> }>();
  const loaded: { sets: number; muscles: readonly ExerciseMuscle[] }[] = [];

  for (const row of rows) {
    const exercise = byExercise.get(row.exerciseId);
    if (!exercise) continue;
    loaded.push({ sets: row.sets, muscles: exercise.muscles });
    for (const piece of exercise.equipment) {
      if (!piece.isAvailable) continue;
      const entry = plansPerEquipment.get(piece.id) ?? { name: piece.name, plans: new Set<string>() };
      entry.plans.add(row.trainingPlanId);
      plansPerEquipment.set(piece.id, entry);
    }
  }

  return {
    otherPlanCount: new Set(rows.map((row) => row.trainingPlanId)).size,
    equipment: [...plansPerEquipment]
      .map(([id, { name, plans }]) => ({ id, name, planCount: plans.size }))
      .sort((a, b) => b.planCount - a.planCount || a.name.localeCompare(b.name)),
    muscleLoad: computeMuscleLoad(loaded),
  };
}

export function buildDemandLines(demand: PlanDemand, planDate: string): string[] {
  const lines = [
    `Other members' plans for ${planDate} (this member's own plan excluded; counted in plans, not exercises): ${demand.otherPlanCount}`,
  ];
  if (demand.otherPlanCount === 0) {
    lines.push('- no other member plans for this date yet');
    return lines;
  }
  const equipment = demand.equipment.slice(0, DEMAND_EQUIPMENT_LIMIT);
  lines.push(
    equipment.length > 0
      ? `- Equipment in demand (plans that use each piece): ${equipment.map((piece) => `${piece.name} ${piece.planCount}`).join(', ')}`
      : '- Equipment in demand: none',
  );
  const muscles = rankMuscles(demand.muscleLoad).slice(0, DEMAND_MUSCLES_LIMIT);
  lines.push(
    muscles.length > 0
      ? `- Muscle load of those plans (weighted sets): ${muscles.map(({ muscle, load }) => `${muscleLabel(muscle)} ${load}`).join(', ')}`
      : '- Muscle load of those plans: none',
  );
  return lines;
}

function formatExercise(row: PlanHistoryRow, state: string): string {
  const load = row.load ? ` ${row.load}` : '';
  return `${row.exerciseName} ${row.sets}x${row.reps}${load} (${state})`;
}

// Grouped by date, newest first. A date before today is marked done or not done from the member's own
// ticks; today and later is only planned, so an unticked exercise there is not a miss.
export function buildPlanHistoryLines(
  rows: readonly PlanHistoryRow[],
  checkInDates: readonly string[],
  today: string,
): string[] {
  const lines = [`Training history, last ${RECENT_PLAN_WINDOW_DAYS} days (newest first):`];
  if (rows.length === 0) {
    lines.push('- no plans in this period');
  } else {
    const byDate = new Map<string, PlanHistoryRow[]>();
    for (const row of rows) byDate.set(row.planDate, [...(byDate.get(row.planDate) ?? []), row]);
    for (const [planDate, exercises] of byDate) {
      const items = exercises.map((row) =>
        formatExercise(row, planDate >= today ? 'planned' : row.completed ? 'done' : 'not done'),
      );
      lines.push(`- ${planDate}: ${items.join('; ')}`);
    }
  }
  lines.push(
    checkInDates.length > 0
      ? `Gym check-in dates in the same period: ${checkInDates.join(', ')}`
      : 'Gym check-in dates in the same period: none',
  );
  return lines;
}

export function buildTrainerNoteLines(reviews: readonly MemberReviewRow[]): string[] {
  if (reviews.length === 0) return [];
  const lines = [
    `Trainer notes and edits for this member (latest ${TRAINER_NOTES_LIMIT}, newest first). Treat them as guidance from the member's trainer:`,
  ];
  for (const review of reviews) {
    const kind = review.isEdit ? 'edit' : 'note';
    lines.push(
      `- ${localDateString(review.createdAt)}, ${kind} by ${review.authorName} on the plan for ${review.planDate}: ${review.note}`,
    );
  }
  return lines;
}

// Shared by the plan and chat prompts. The AI module carries text only, so an exam contributes its typed
// findings; its attached file is never read (FR-12).
export function buildOnboardingLines(submissions: readonly OnboardingSubmission[]): string[] {
  const lines = [
    'Onboarding submissions (most recent first; the first is the current truth, older ones only add history that it does not contradict):',
  ];
  for (const submission of submissions) {
    const conditions = submission.physicalConditions.conditions.join(', ') || 'none';
    const otherNotes = submission.physicalConditions.otherNotes ? ` (${submission.physicalConditions.otherNotes})` : '';
    lines.push(`- Height: ${submission.heightCm} cm, weight: ${submission.weightKg} kg`);
    lines.push(`  Goals: ${submission.goals}`);
    lines.push(`  Medications: ${submission.medications.join(', ') || 'none'}`);
    lines.push(`  Conditions: ${conditions}${otherNotes}`);
    if (submission.exams.length === 0) {
      lines.push('  Medical exams: none');
      continue;
    }
    lines.push('  Medical exams:');
    for (const exam of submission.exams) {
      lines.push(`  - ${exam.name}${exam.date ? ` (${exam.date})` : ''}: ${exam.findings}`);
    }
  }
  return lines;
}

export interface PlanContext {
  planDate: string;
  today: string;
  ageYears: number | null;
  onboardingSubmissions: Awaited<ReturnType<typeof findSubmissionsByUserId>>;
  profileEvents: ProfileEvent[];
  planHistory: PlanHistoryRow[];
  checkInDates: string[];
  trainerReviews: MemberReviewRow[];
  demand: PlanDemand;
  availableExercises: AvailableExercise[];
  muscleFocus: MemberMuscleFocus[];
}

async function assemblePlanContext(userId: string, planDate: string): Promise<PlanContext> {
  const since = shiftDate(planDate, -RECENT_PLAN_WINDOW_DAYS);
  const [
    user,
    onboardingSubmissions,
    profileEvents,
    planHistory,
    checkInTimes,
    trainerReviews,
    demandRows,
    catalog,
    muscleFocus,
  ] = await Promise.all([
    findUserById(userId),
    findSubmissionsByUserId(userId),
    repository.findUnresolvedProfileEvents(userId),
    repository.findPlanHistory(userId, since, planDate),
    findCheckInTimes(userId, startOfLocalDay(since), startOfLocalDay(planDate)),
    repository.findRecentReviewsForMember(userId, TRAINER_NOTES_LIMIT),
    repository.findDemandRowsForDate(planDate, userId),
    listExercises(),
    findFocusByUserId(userId),
  ]);

  return {
    planDate,
    today: todayLocal(),
    ageYears: computeAge(user?.birthdate ?? null),
    onboardingSubmissions,
    // The focus block below is the current truth; its change events would only repeat stale levels.
    profileEvents: profileEvents.filter((event) => event.eventType !== 'muscle_focus_changed'),
    planHistory,
    checkInDates: [...new Set(checkInTimes.map((time) => localDateString(time)))].sort().reverse(),
    trainerReviews,
    demand: computePlanDemand(demandRows, catalog),
    availableExercises: catalog.filter((exercise) => exercise.isAvailable),
    muscleFocus,
  };
}

function listMuscles(muscles: readonly ExerciseMuscle[], role: ExerciseMuscle['role']) {
  const names = muscles.filter((entry) => entry.role === role).map((entry) => entry.muscle);
  return names.length > 0 ? names.join(', ') : 'none';
}

// One catalog line shared by every prompt that lists exercises, so the AI always sees the same muscle
// vocabulary (the ids drawn on the body map).
export function formatCatalogLine(exercise: AvailableExercise): string {
  return `- ${exercise.id} | ${exercise.name} | primary: ${listMuscles(exercise.muscles, 'primary')} | secondary: ${listMuscles(exercise.muscles, 'secondary')}`;
}

export function buildMuscleFocusLines(muscleFocus: readonly MemberMuscleFocus[]): string[] {
  const lines = ['Member muscle focus (a preference between -2 and +2, normal is 0; unlisted muscles are normal):'];
  if (muscleFocus.length === 0) {
    lines.push('- none set');
    return lines;
  }
  const ordered = [...muscleFocus].sort((a, b) => b.bias - a.bias);
  for (const { muscle, bias } of ordered) {
    lines.push(`- ${muscle}: ${bias > 0 ? '+' : ''}${bias} (${FOCUS_BIAS_LABELS[bias]?.toLowerCase()})`);
  }
  return lines;
}

// FR-15: the system/user prompt wording is this project's own product decision, not a requirement quote.
const PLAN_SYSTEM_PROMPT =
  "You are a personal trainer AI. Build today's training plan for a gym member using only the " +
  "provided exercise catalog and the member's profile, onboarding data, and history. Choose exercises " +
  'appropriate to their goals and physical conditions, avoiding anything they should not safely perform. ' +
  'Each catalog exercise lists the muscles it trains as primary or secondary. Use the member muscle focus ' +
  'to steer the balance of the plan: give muscles with a positive focus more exercises and sets, and muscles ' +
  'with a negative focus fewer, with -2 meaning avoid training that muscle as a primary target unless needed. ' +
  'Focus is a preference only: injuries, medical conditions, medications, exam findings and safety always ' +
  'override it, and a plan must never be built from the focus alone. Size the load to the height and weight ' +
  'you are given and read the medical exam findings for anything that limits what the member can do. Reason ' +
  'from the member history you are given: the recent plans with what was done and not done, the check-in ' +
  'dates and the remembered facts. ' +
  "Trainer notes and edits are guidance from the member's own trainer, so follow them. You are also told how " +
  "many other members' plans already use each piece of equipment and train each muscle on that date. When the " +
  "member's goal is broad, spread the exercises across different equipment and avoid pieces other members " +
  'already need heavily, but safety, injuries, medication, exams and muscle focus always win over that spreading. ' +
  'Respond only with the chosen exercises.';

export function buildPlanUserPrompt(context: PlanContext, instruction?: string): string {
  const lines: string[] = [];
  lines.push(`Plan date: ${context.planDate}`);
  lines.push(context.ageYears !== null ? `Member age: ${context.ageYears}` : 'Member age: unknown');

  lines.push(...buildOnboardingLines(context.onboardingSubmissions));

  if (context.profileEvents.length > 0) {
    lines.push('Remembered facts about the member (still unresolved, newest first):');
    for (const event of context.profileEvents) {
      lines.push(`- ${localDateString(event.createdAt)} ${event.eventType}: ${JSON.stringify(event.payload)}`);
    }
  }

  lines.push(...buildTrainerNoteLines(context.trainerReviews));
  lines.push(...buildPlanHistoryLines(context.planHistory, context.checkInDates, context.today));
  lines.push(...buildDemandLines(context.demand, context.planDate));
  lines.push(...buildMuscleFocusLines(context.muscleFocus));

  lines.push('Available exercise catalog - choose exerciseId only from this list:');
  for (const exercise of context.availableExercises) lines.push(formatCatalogLine(exercise));

  if (instruction) {
    lines.push('Member request for this plan (follow it unless it conflicts with safety, injuries or medication):');
    lines.push(instruction);
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
  return runStructured({
    purpose: 'plan',
    system: PLAN_SYSTEM_PROMPT,
    user: contextPrompt,
    schema: PlanGenerationSchema,
  });
}

export type PlanGeneratorMode = 'ai' | 'placeholder';

// Unset defaults to placeholder only when AI_MODE is mock (the AI module's own plan fixture is always
// empty in mock mode, see ai/mock-fixtures.ts) - otherwise "ai" for the real integration.
function effectivePlanGenerator(): PlanGeneratorMode {
  return env.PLAN_GENERATOR ?? (env.AI_MODE === 'mock' ? 'placeholder' : 'ai');
}

// Deterministic (no randomness): exercises are grouped by their lead muscle (the primary muscle the member
// wants most), groups are ordered by that focus and then by the muscle registry, and one exercise per group
// is picked alphabetically, up to 5. Groups topped up from already-used ones (still alphabetical) if fewer
// than 3 distinct groups have an available exercise. An exercise whose primary muscle is set to -2 is left
// out unless that would leave nothing to choose from, and a positive or negative lead focus adds or removes
// a set so the shift is visible without a model.
export function generatePlaceholderExercises(
  availableExercises: readonly AvailableExercise[],
  muscleFocus: readonly MemberMuscleFocus[] = [],
): PlanExerciseInput[] {
  const biasOf = (muscle: MuscleId) => muscleFocus.find((entry) => entry.muscle === muscle)?.bias ?? 0;
  const primaryMuscles = (exercise: AvailableExercise) =>
    exercise.muscles.filter((entry) => entry.role === 'primary').map((entry) => entry.muscle);
  const leadMuscle = (exercise: AvailableExercise) =>
    [...primaryMuscles(exercise)].sort(
      (a, b) => biasOf(b) - biasOf(a) || MUSCLE_IDS.indexOf(a) - MUSCLE_IDS.indexOf(b),
    )[0];

  const wanted = availableExercises.filter((exercise) =>
    primaryMuscles(exercise).some((muscle) => biasOf(muscle) > FOCUS_BIAS_MIN),
  );
  const pool = wanted.length > 0 ? wanted : availableExercises;

  const byLead = new Map<MuscleId | undefined, AvailableExercise[]>();
  for (const exercise of pool) {
    const lead = leadMuscle(exercise);
    byLead.set(lead, [...(byLead.get(lead) ?? []), exercise]);
  }
  for (const list of byLead.values()) list.sort((a, b) => a.name.localeCompare(b.name));

  const leads = [...byLead.keys()].sort(
    (a, b) =>
      (b ? biasOf(b) : 0) - (a ? biasOf(a) : 0) ||
      (a ? MUSCLE_IDS.indexOf(a) : MUSCLE_IDS.length) - (b ? MUSCLE_IDS.indexOf(b) : MUSCLE_IDS.length),
  );
  const picked: AvailableExercise[] = [];
  const pickedIds = new Set<string>();

  for (const lead of leads) {
    if (picked.length >= PLACEHOLDER_MAX_EXERCISES) break;
    const candidate = byLead.get(lead)![0]!;
    picked.push(candidate);
    pickedIds.add(candidate.id);
  }

  topUp: for (const lead of leads) {
    for (const exercise of byLead.get(lead)!) {
      if (picked.length >= PLACEHOLDER_MIN_EXERCISES) break topUp;
      if (!pickedIds.has(exercise.id)) {
        picked.push(exercise);
        pickedIds.add(exercise.id);
      }
    }
  }

  return picked.map((exercise) => {
    const lead = leadMuscle(exercise);
    const bias = lead ? biasOf(lead) : 0;
    const sets = PLACEHOLDER_SETS + (bias > 0 ? 1 : 0) - (bias < 0 ? 1 : 0);
    return { exerciseId: exercise.id, sets, reps: PLACEHOLDER_REPS };
  });
}

export interface GenerateForDateOverrides {
  evaluatePlan?: EvaluatePlan;
  generator?: PlanGeneratorMode;
  // A member request (from chat) appended to the prompt; the placeholder generator cannot use it.
  instruction?: string;
}

export type OverwriteReason = 'trainer_edited' | 'has_completed';

// editedBy and editedAt describe the trainer edit, so they are null when the only reason to ask is that
// the member already ticked exercises off.
export interface NeedsConfirmation {
  status: 'needs_confirmation';
  reason: OverwriteReason;
  editedBy: string | null;
  editedAt: Date | null;
  completedCount: number;
}

export type GenerateForDateResult =
  | { status: 'ok'; plan: TrainingPlan & { exercises: TrainingPlanExercise[] } }
  | NeedsConfirmation;

// RN-06/FR-22: replacing a trainer-edited plan, or one with ticked exercises, needs the member's explicit
// confirmation. This is a normal, expected outcome, so it is returned as data rather than thrown.
// A trainer edit takes precedence as the reason when both apply.
export async function checkOverwriteGuard(
  existing: TrainingPlan,
  options: { countCompleted: boolean },
): Promise<NeedsConfirmation | null> {
  const isTrainerEdited = existing.status === 'trainer_edited';
  const completedCount = options.countCompleted
    ? (await repository.findExercisesForPlan(existing.id)).filter((exercise) => exercise.completed).length
    : 0;
  if (!isTrainerEdited && completedCount === 0) return null;

  const editor =
    isTrainerEdited && existing.lastEditedByUserId ? await findUserById(existing.lastEditedByUserId) : null;
  return {
    status: 'needs_confirmation',
    reason: isTrainerEdited ? 'trainer_edited' : 'has_completed',
    editedBy: isTrainerEdited ? (editor?.name ?? 'a trainer') : null,
    editedAt: isTrainerEdited ? (existing.lastEditedAt ?? existing.aiGeneratedAt ?? new Date()) : null,
    completedCount,
  };
}

// FR-15/FR-18: publishes immediately, no trainer approval step. A failed AI call, or an AI answer with no
// usable catalog exercise, is an error and never a plan: only the placeholder generator mode may build one
// from the deterministic fallback.
export async function generateForDate(
  userId: string,
  planDate: string,
  confirmOverwrite = false,
  overrides: GenerateForDateOverrides = {},
): Promise<GenerateForDateResult> {
  const existing = await repository.findPlanByUserAndDate(userId, planDate);
  if (existing && !confirmOverwrite) {
    const guard = await checkOverwriteGuard(existing, { countCompleted: true });
    if (guard) return guard;
  }

  const context = await assemblePlanContext(userId, planDate);
  const availableIds = new Set(context.availableExercises.map((exercise) => exercise.id));
  const generator = overrides.generator ?? effectivePlanGenerator();

  let exercises: PlanExerciseInput[];
  if (generator === 'ai') {
    const evaluatePlan = overrides.evaluatePlan ?? defaultEvaluatePlan;
    const result = await evaluatePlan(buildPlanUserPrompt(context, overrides.instruction));
    if (!result.ok) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI is temporarily unavailable' });

    exercises = result.data.exercises.filter((exercise) => availableIds.has(exercise.exerciseId));
    if (exercises.length === 0) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI is temporarily unavailable' });
    }
  } else {
    exercises = generatePlaceholderExercises(context.availableExercises, context.muscleFocus);
  }

  const plan = await repository.replacePlan({ userId, planDate, exercises });
  return { status: 'ok', plan };
}

export interface PlanExerciseView {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscles: ExerciseMuscle[];
  instructions: string;
  sets: number;
  reps: number;
  load: string | null;
  notes: string | null;
  completed: boolean;
  orderIndex: number;
  isPerformable: boolean;
  equipmentDown: string[];
}

export interface PlanView {
  id: string;
  userId: string;
  planDate: string;
  status: TrainingPlan['status'];
  exercises: PlanExerciseView[];
  muscleLoad: MuscleLoad;
  // True while the plan can still change (today or later) and holds an exercise that cannot be done.
  needsReview: boolean;
  lastEditedAt: Date | null;
  lastEditedByName: string | null;
  // The member reads every trainer note and edit on their own plan, oldest first, as the staff wrote them.
  trainerNotes: { id: string; authorName: string; note: string; isEdit: boolean; createdAt: Date }[];
}

// FR-17: isPerformable is computed fresh from the catalog's current availability on every read, never
// stored - toggling a piece of equipment changes what a plan shows without touching the plan itself.
// Only for a plan that can still be done (today or later): a past plan is history, so equipment going
// down today must not rewrite what happened on that date.
async function toPlanView(plan: TrainingPlan): Promise<PlanView> {
  const [exercises, catalog, reviews] = await Promise.all([
    repository.findExercisesForPlanWithDetails(plan.id),
    listExercises(),
    repository.findReviewsForPlan(plan.id),
  ]);
  const isPast = plan.planDate < todayLocal();
  const availableById = new Map(catalog.map((exercise) => [exercise.id, exercise.isAvailable]));
  const catalogById = new Map(catalog.map((exercise) => [exercise.id, exercise]));
  const editor = plan.lastEditedByUserId ? await findUserById(plan.lastEditedByUserId) : null;

  const views = exercises.map((exercise) => ({
    id: exercise.id,
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseName,
    muscles: exercise.muscles,
    instructions: exercise.instructions,
    sets: exercise.sets,
    reps: exercise.reps,
    load: exercise.load,
    notes: exercise.notes,
    completed: exercise.completed,
    orderIndex: exercise.orderIndex,
    isPerformable: isPast || (availableById.get(exercise.exerciseId) ?? false),
    equipmentDown: isPast
      ? []
      : (catalogById.get(exercise.exerciseId)?.equipment ?? [])
          .filter((item) => !item.isAvailable)
          .map((item) => item.name),
  }));

  return {
    id: plan.id,
    userId: plan.userId,
    planDate: plan.planDate,
    status: plan.status,
    exercises: views,
    muscleLoad: computeMuscleLoad(views.filter((exercise) => exercise.isPerformable)),
    needsReview: plan.planDate >= todayLocal() && views.some((exercise) => !exercise.isPerformable),
    lastEditedAt: plan.lastEditedAt,
    lastEditedByName: editor?.name ?? null,
    trainerNotes: reviews.map(({ id, authorName, note, isEdit, createdAt }) => ({
      id,
      authorName,
      note,
      isEdit,
      createdAt,
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

export function listUpcomingPlans(userId: string, today: string = todayLocal()) {
  return repository.findUpcomingPlans(userId, today);
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
const TOP_MUSCLES_LIMIT = 5;

export interface AggregateCount {
  name: string;
  count: number;
}

export interface PlanAggregate {
  topExercises: AggregateCount[];
  topMuscles: AggregateCount[];
}

function topCounts(values: readonly string[], limit: number): AggregateCount[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

// FR-29: an anonymized cross-member summary for "what is everyone doing today" - the underlying query
// (findExercisesForDate) never selects a user id or name, so there is nothing to strip here, only to count.
export async function getTodayAggregate(): Promise<PlanAggregate> {
  const rows = await repository.findExercisesForDate(todayLocal());
  return {
    topExercises: topCounts(
      rows.map((row) => row.exerciseName),
      TOP_EXERCISES_LIMIT,
    ),
    topMuscles: rankMuscles(computeMuscleLoad(rows))
      .slice(0, TOP_MUSCLES_LIMIT)
      .map(({ muscle, load }) => ({ name: muscleLabel(muscle), count: load })),
  };
}
