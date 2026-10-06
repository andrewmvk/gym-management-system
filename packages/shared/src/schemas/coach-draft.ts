import type { BeforeRow, ProposalRow, SafetyWarning } from '@shared/schemas/coach';
import { type ExerciseMuscle, type MuscleId, muscleLabel } from '@shared/schemas/muscles';

export type DiffChange = 'added' | 'changed' | 'unchanged';

export interface DiffRow<Row extends ProposalRow> {
  row: Row;
  change: DiffChange;
  previous: BeforeRow | null;
}

export interface DraftDiff<Row extends ProposalRow> {
  rows: DiffRow<Row>[];
  removed: BeforeRow[];
}

// No weight and a weight of zero are the same thing: nothing is added to the bar.
const normalizeLoad = (load: number | null | undefined) => load ?? 0;

export function hasNumbersChanged(
  a: { sets: number; reps: number; load: number | null | undefined },
  b: { sets: number; reps: number; load: number | null | undefined },
): boolean {
  return a.sets !== b.sets || a.reps !== b.reps || normalizeLoad(a.load) !== normalizeLoad(b.load);
}

// Compared by exercise, not by position, so reordering alone is not a change. The server and the client
// both call this, so the card the member sees and the log a trainer reads always agree.
export function diffDraft<Row extends ProposalRow>(
  before: readonly BeforeRow[],
  after: readonly Row[],
): DraftDiff<Row> {
  const beforeById = new Map(before.map((row) => [row.exerciseId, row]));
  const afterIds = new Set(after.map((row) => row.exerciseId));

  const rows = after.map((row): DiffRow<Row> => {
    const previous = beforeById.get(row.exerciseId) ?? null;
    if (!previous) return { row, change: 'added', previous: null };
    return { row, change: hasNumbersChanged(previous, row) ? 'changed' : 'unchanged', previous };
  });
  return { rows, removed: before.filter((row) => !afterIds.has(row.exerciseId)) };
}

export function countChanges(diff: DraftDiff<ProposalRow>): number {
  return diff.rows.filter((entry) => entry.change !== 'unchanged').length + diff.removed.length;
}

export interface InjuryForConflicts {
  description: string;
  muscles: readonly MuscleId[];
}

export interface ExerciseForConflicts {
  exerciseId: string;
  muscles: readonly ExerciseMuscle[];
}

// A primary muscle of the exercise that an injury names. Secondary muscles only assist, so they do not
// raise a warning. Needs no AI: an injury the model tagged with muscles is checked the same way every time.
export function findInjuryConflicts(
  exercises: readonly ExerciseForConflicts[],
  injuries: readonly InjuryForConflicts[],
): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];
  for (const exercise of exercises) {
    const primary = exercise.muscles.filter((entry) => entry.role === 'primary').map((entry) => entry.muscle);
    const injury = injuries.find((candidate) => candidate.muscles.some((muscle) => primary.includes(muscle)));
    if (!injury) continue;
    const muscle = injury.muscles.find((candidate) => primary.includes(candidate))!;
    warnings.push({
      exerciseId: exercise.exerciseId,
      reason: `Trains your ${muscleLabel(muscle).toLowerCase()}, and you reported: ${injury.description}`,
      source: 'injury',
    });
  }
  return warnings;
}

// Injury warnings come first and win over a coach warning on the same exercise.
export function mergeWarnings(...lists: readonly SafetyWarning[][]): SafetyWarning[] {
  const byExercise = new Map<string, SafetyWarning>();
  for (const warning of lists.flat()) {
    const existing = byExercise.get(warning.exerciseId);
    if (!existing || (existing.source === 'coach' && warning.source === 'injury')) {
      byExercise.set(warning.exerciseId, warning);
    }
  }
  return [...byExercise.values()];
}
