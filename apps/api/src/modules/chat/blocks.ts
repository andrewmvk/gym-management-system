import { randomUUID } from 'node:crypto';
import { type CatalogEntry, type ChatContext, loadStoredPlan } from '@api/modules/chat/context';
import type {
  AiExplainer,
  AiPicker,
  AiProposal,
  AiSafety,
  BeforeRow,
  CoachBlock,
  PickerOption,
  ProposalRow,
  SafetyWarning,
} from '@cadence/shared/schemas/coach';
import { WEIGHT_KG_MAX } from '@cadence/shared/schemas/coach';
import { countChanges, diffDraft, findInjuryConflicts, mergeWarnings } from '@cadence/shared/schemas/coach-draft';

const MAX_PROPOSAL_EXERCISES = 20;
const MAX_PICKER_OPTIONS = 6;
const MAX_TEXT = 280;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function refOf(entry: CatalogEntry) {
  return { exerciseId: entry.id, name: entry.name, muscles: [...entry.muscles] };
}

// The model's numbers and sentences are only a suggestion: they are rounded into the range the plan accepts
// and cut to a length the cards can show, instead of failing the whole reply over a 25-set exercise.
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)));

// A weight is a number of kilograms. The model may write 20, "20" or "20 kg"; anything that is not a positive
// number (or no weight at all) means the exercise has no added weight.
function parseWeight(value: number | string | null | undefined): number | null {
  const parsed = typeof value === 'string' ? Number.parseFloat(value.replace(',', '.')) : value;
  if (parsed === null || parsed === undefined || !Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.min(WEIGHT_KG_MAX, Math.round(parsed * 10) / 10);
}
const shorten = (text: string, max: number = MAX_TEXT) =>
  text.length > max ? `${text.slice(0, max - 3).trimEnd()}...` : text;
const sentences = (list: readonly string[] | null | undefined, max: number) =>
  (list ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max)
    .map((item) => shorten(item));

function injuryWarningFor(entry: CatalogEntry, context: ChatContext): string | null {
  const [warning] = findInjuryConflicts([{ exerciseId: entry.id, muscles: entry.muscles }], context.injuries);
  return warning?.reason ?? null;
}

// A past day can only be corrected when a plan exists for it; otherwise the proposal could never be applied,
// so it targets the plan date the member is looking at instead.
async function resolveProposalDate(userId: string, date: string, context: ChatContext): Promise<string> {
  if (date >= context.today) return date;
  const existing = await loadStoredPlan(userId, date);
  return existing.exercises.length > 0 ? date : context.planDate;
}

// The server never trusts the model's picture of a change: the diff is recomputed from the saved plan, the
// exercise ids must exist and be available, and injury conflicts come from the member's own facts.
export async function buildProposalBlock(
  userId: string,
  proposal: AiProposal,
  context: ChatContext,
): Promise<CoachBlock | null> {
  const date = await resolveProposalDate(
    userId,
    ISO_DATE.test(proposal.date) ? proposal.date : context.planDate,
    context,
  );
  const isPast = date < context.today;
  const catalogById = new Map(context.catalog.map((entry) => [entry.id, entry]));
  const isAllowed = (entry: CatalogEntry | undefined): entry is CatalogEntry =>
    !!entry && (isPast || entry.isAvailable);

  const seen = new Set<string>();
  const after: ProposalRow[] = [];
  for (const exercise of proposal.exercises) {
    const entry = catalogById.get(exercise.exerciseId);
    if (!isAllowed(entry) || seen.has(entry.id) || after.length >= MAX_PROPOSAL_EXERCISES) continue;
    seen.add(entry.id);
    after.push({
      ...refOf(entry),
      sets: clamp(exercise.sets, 1, 20),
      reps: clamp(exercise.reps, 1, 100),
      load: parseWeight(exercise.load),
      notes: exercise.notes?.trim().slice(0, 500) || null,
      completed: isPast ? (exercise.completed ?? false) : null,
      reason: exercise.reason?.trim() ? shorten(exercise.reason.trim()) : null,
    });
  }
  if (after.length === 0) return null;

  const stored = date === context.storedPlan.date ? context.storedPlan : await loadStoredPlan(userId, date);
  const before: BeforeRow[] = stored.exercises.map((exercise) => ({
    exerciseId: exercise.exerciseId,
    name: exercise.name,
    muscles: exercise.muscles,
    sets: exercise.sets,
    reps: exercise.reps,
    load: exercise.load,
  }));

  const focusChanges = (proposal.focusChanges ?? []).flatMap(({ muscle, bias: rawBias }) => {
    const bias = clamp(rawBias, -2, 2);
    const from = context.muscleFocus.find((entry) => entry.muscle === muscle)?.bias ?? 0;
    return from === bias ? [] : [{ muscle, from, to: bias }];
  });

  const coachWarnings: SafetyWarning[] = (proposal.warnings ?? [])
    .filter((warning) => seen.has(warning.exerciseId))
    .map((warning) => ({ exerciseId: warning.exerciseId, reason: shorten(warning.reason), source: 'coach' }));
  const warnings = mergeWarnings(
    findInjuryConflicts(
      after.map((row) => ({ exerciseId: row.exerciseId, muscles: row.muscles })),
      context.injuries,
    ),
    coachWarnings,
  );

  if (countChanges(diffDraft(before, after)) === 0 && focusChanges.length === 0) return null;
  return {
    type: 'plan_proposal',
    id: randomUUID(),
    date,
    summary: shorten(proposal.summary),
    before,
    after,
    warnings,
    focusChanges,
  };
}

export function buildPickerBlock(picker: AiPicker, context: ChatContext): CoachBlock | null {
  const allowedIds = context.muscleCandidates.length > 0 ? new Set(context.muscleCandidates.map((e) => e.id)) : null;
  const catalogById = new Map(context.catalog.map((entry) => [entry.id, entry]));
  const seen = new Set<string>();
  const options: PickerOption[] = [];
  for (const option of picker.options) {
    const entry = catalogById.get(option.exerciseId);
    if (!entry?.isAvailable || seen.has(entry.id) || (allowedIds && !allowedIds.has(entry.id))) continue;
    if (options.length >= MAX_PICKER_OPTIONS) break;
    seen.add(entry.id);
    options.push({
      ...refOf(entry),
      sets: clamp(option.sets, 1, 20),
      reps: clamp(option.reps, 1, 100),
      load: parseWeight(option.load),
      reason: shorten(option.reason),
      warning: injuryWarningFor(entry, context),
    });
  }
  return options.length > 0 ? { type: 'exercise_picker', id: randomUUID(), muscle: picker.muscle, options } : null;
}

export function buildExplainerBlock(explainer: AiExplainer, context: ChatContext): CoachBlock | null {
  const entry = context.catalog.find((candidate) => candidate.id === explainer.exerciseId);
  if (!entry) return null;
  return {
    type: 'exercise_explainer',
    id: randomUUID(),
    exercise: refOf(entry),
    summary: shorten(explainer.summary),
    technique: sentences(explainer.technique, 6),
    benefits: sentences(explainer.benefits, 5),
    mistakes: sentences(explainer.mistakes, 5),
    personalNote: explainer.personalNote?.trim() ? shorten(explainer.personalNote.trim()) : null,
  };
}

export function buildSafetyBlock(safety: AiSafety, context: ChatContext): CoachBlock | null {
  const catalogById = new Map(context.catalog.map((entry) => [entry.id, entry]));
  const entry = catalogById.get(safety.exerciseId);
  if (!entry) return null;

  const current = (context.draft ?? context.storedPlan).exercises.find((exercise) => exercise.exerciseId === entry.id);
  const alternatives: PickerOption[] = [];
  for (const id of (safety.alternativeExerciseIds ?? []).slice(0, 4)) {
    const alternative = catalogById.get(id);
    if (!alternative?.isAvailable || alternative.id === entry.id || injuryWarningFor(alternative, context)) continue;
    alternatives.push({
      ...refOf(alternative),
      sets: current?.sets ?? 3,
      reps: current?.reps ?? 10,
      load: null,
      reason: 'A safer alternative',
      warning: null,
    });
  }
  return {
    type: 'safety_warning',
    id: randomUUID(),
    exercise: refOf(entry),
    reason: shorten(safety.reason),
    alternatives,
  };
}
