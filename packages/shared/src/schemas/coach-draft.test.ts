import type { BeforeRow, ProposalRow } from '@shared/schemas/coach';
import { countChanges, diffDraft, findInjuryConflicts, mergeWarnings } from '@shared/schemas/coach-draft';
import { describe, expect, it } from 'vitest';

const SQUAT = '11111111-1111-4111-8111-111111111111';
const PRESS = '22222222-2222-4222-8222-222222222222';
const ROW = '33333333-3333-4333-8333-333333333333';

function before(exerciseId: string, sets: number, reps: number, load: number | null = null): BeforeRow {
  return { exerciseId, name: exerciseId, muscles: [], sets, reps, load };
}

function after(exerciseId: string, sets: number, reps: number, load: number | null = null): ProposalRow {
  return { ...before(exerciseId, sets, reps, load), notes: null, completed: null, reason: null };
}

describe('diffDraft', () => {
  it('marks added, changed, unchanged and removed rows by exercise', () => {
    const diff = diffDraft([before(SQUAT, 4, 10), before(PRESS, 3, 8)], [after(ROW, 3, 12), after(SQUAT, 4, 8)]);

    expect(diff.rows.map((entry) => [entry.row.exerciseId, entry.change])).toEqual([
      [ROW, 'added'],
      [SQUAT, 'changed'],
    ]);
    expect(diff.rows[1]?.previous?.reps).toBe(10);
    expect(diff.removed.map((row) => row.exerciseId)).toEqual([PRESS]);
    expect(countChanges(diff)).toBe(3);
  });

  it('does not count a reorder or an empty load as a change', () => {
    const diff = diffDraft(
      [before(SQUAT, 4, 10, null), before(PRESS, 3, 8)],
      [after(PRESS, 3, 8), after(SQUAT, 4, 10, 0)],
    );

    expect(diff.rows.every((entry) => entry.change === 'unchanged')).toBe(true);
    expect(countChanges(diff)).toBe(0);
  });

  it('treats a load edit as a change', () => {
    const diff = diffDraft([before(SQUAT, 4, 10, 20)], [after(SQUAT, 4, 10, 22.5)]);

    expect(diff.rows[0]?.change).toBe('changed');
  });
});

describe('findInjuryConflicts', () => {
  const squat = {
    exerciseId: SQUAT,
    muscles: [
      { muscle: 'quads', role: 'primary' },
      { muscle: 'glutes', role: 'secondary' },
    ] as const,
  };
  const row = {
    exerciseId: ROW,
    muscles: [
      { muscle: 'lats', role: 'primary' },
      { muscle: 'biceps', role: 'secondary' },
    ] as const,
  };

  it('flags an exercise whose primary muscle an injury names', () => {
    const warnings = findInjuryConflicts([squat, row], [{ description: 'sore knee', muscles: ['quads'] }]);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ exerciseId: SQUAT, source: 'injury' });
    expect(warnings[0]?.reason).toContain('sore knee');
  });

  it('ignores secondary muscles and injuries without muscles', () => {
    expect(findInjuryConflicts([squat], [{ description: 'tight hips', muscles: ['glutes'] }])).toEqual([]);
    expect(findInjuryConflicts([squat], [{ description: 'old injury', muscles: [] }])).toEqual([]);
  });
});

describe('mergeWarnings', () => {
  it('keeps one warning per exercise and prefers the injury one', () => {
    const merged = mergeWarnings(
      [{ exerciseId: SQUAT, reason: 'coach', source: 'coach' }],
      [{ exerciseId: SQUAT, reason: 'injury', source: 'injury' }],
    );

    expect(merged).toEqual([{ exerciseId: SQUAT, reason: 'injury', source: 'injury' }]);
  });
});
