import { buildDistributionLines, buildGroupCandidates } from '@api/modules/chat/context';
import { describe, expect, it } from 'vitest';

const exercise = (
  id: string,
  name: string,
  muscles: { muscle: 'chest' | 'quads' | 'glutes' | 'biceps'; role: 'primary' | 'secondary' }[],
) => ({
  id,
  name,
  muscles,
});

describe('buildDistributionLines', () => {
  it('sums sets per group with a supporting muscle at half, and lists the muscles with no work', () => {
    const lines = buildDistributionLines([
      {
        exerciseId: 'a',
        name: 'Squat',
        muscles: [
          { muscle: 'quads', role: 'primary' },
          { muscle: 'glutes', role: 'secondary' },
        ],
        sets: 4,
        reps: 8,
        load: null,
        notes: null,
        completed: false,
      },
    ]);

    expect(lines.find((line) => line.startsWith('- Legs'))).toContain('Legs 6 ');
    expect(lines.find((line) => line.startsWith('- Legs'))).toContain('Quads 4');
    expect(lines.find((line) => line.startsWith('- Legs'))).toContain('Glutes 2');
    expect(lines.find((line) => line.startsWith('- Chest'))).toContain('Chest 0 (Chest 0)');
  });
});

describe('buildGroupCandidates', () => {
  it('offers exercises for the least worked muscle of the group first, once each, never one already in the plan', () => {
    const squat = exercise('squat', 'Squat', [
      { muscle: 'quads', role: 'primary' },
      { muscle: 'glutes', role: 'secondary' },
    ]);
    const bridge = exercise('bridge', 'Glute Bridge', [{ muscle: 'glutes', role: 'primary' }]);
    const press = exercise('press', 'Bench Press', [{ muscle: 'chest', role: 'primary' }]);
    const inPlan = exercise('extension', 'Leg Extension', [{ muscle: 'quads', role: 'primary' }]);

    const picked = buildGroupCandidates('legs', [squat, bridge, press, inPlan], new Set(['extension']), [], {
      quads: 4,
    });

    expect(picked.map((entry) => entry.id)).toEqual(['bridge', 'squat']);
  });
});
