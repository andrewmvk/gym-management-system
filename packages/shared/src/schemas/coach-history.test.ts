import type { CoachBlock } from '@shared/schemas/coach';
import { buildHistory, summarizeBlock } from '@shared/schemas/coach-history';
import { describe, expect, it } from 'vitest';

const SQUAT = '11111111-1111-4111-8111-111111111111';
const LUNGE = '22222222-2222-4222-8222-222222222222';
const BLOCK_ID = '33333333-3333-4333-8333-333333333333';

const proposal: CoachBlock = {
  type: 'plan_proposal',
  id: BLOCK_ID,
  date: '2026-10-04',
  summary: 'Add lunges',
  before: [{ exerciseId: SQUAT, name: 'Squat', muscles: [], sets: 4, reps: 10, load: null }],
  after: [
    {
      exerciseId: SQUAT,
      name: 'Squat',
      muscles: [],
      sets: 3,
      reps: 8,
      load: null,
      notes: null,
      completed: null,
      reason: null,
    },
    {
      exerciseId: LUNGE,
      name: 'Walking Lunge',
      muscles: [],
      sets: 3,
      reps: 12,
      load: null,
      notes: null,
      completed: null,
      reason: null,
    },
  ],
  warnings: [],
  memoryNote: 'Asked for a lighter day.',
};

describe('summarizeBlock', () => {
  it('says what a proposal adds and changes, and that it waits for Apply', () => {
    const summary = summarizeBlock(proposal);

    expect(summary).toContain('adds Walking Lunge 3x12');
    expect(summary).toContain('changes Squat from 4x10 to 3x8');
    expect(summary).toContain('only when the member taps Apply');
  });

  it('names the options of a picker and leaves quick replies out', () => {
    const picker: CoachBlock = {
      type: 'exercise_picker',
      id: BLOCK_ID,
      muscle: 'quads',
      options: [
        {
          exerciseId: LUNGE,
          name: 'Walking Lunge',
          muscles: [],
          sets: 3,
          reps: 12,
          load: 10,
          reason: 'r',
          warning: null,
        },
      ],
    };

    expect(summarizeBlock(picker)).toContain('Quads');
    expect(summarizeBlock(picker)).toContain('Walking Lunge 3x12 10 kg');
    expect(summarizeBlock({ type: 'quick_replies', id: BLOCK_ID, replies: ['a'] })).toBeNull();
  });
});

describe('buildHistory', () => {
  it('keeps the last turns in order, with a coach turn carrying what it showed', () => {
    const history = buildHistory([
      { role: 'member', text: 'Add lunges', blocks: [] },
      { role: 'assistant', text: 'Here you go.', blocks: [proposal] },
    ]);

    expect(history.map((turn) => turn.role)).toEqual(['member', 'assistant']);
    expect(history[1]?.text).toContain('Here you go.');
    expect(history[1]?.text).toContain('adds Walking Lunge');
  });

  it('drops empty turns and keeps only the most recent eight', () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      role: 'member' as const,
      text: `message ${index}`,
      blocks: [],
    }));

    const history = buildHistory([{ role: 'assistant', text: '', blocks: [] }, ...many]);

    expect(history).toHaveLength(8);
    expect(history[0]?.text).toBe('message 4');
  });
});
