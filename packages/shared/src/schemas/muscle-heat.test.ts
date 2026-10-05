import {
  computeEquipmentImpact,
  computeMuscleCoverage,
  computeMuscleLoad,
  groupMuscleLoad,
  HEAT_STEPS,
  heatStep,
  rankMuscles,
} from '@shared/schemas/muscle-heat';
import { ExerciseMusclesSchema, MUSCLE_GROUPS, MUSCLE_IDS, MUSCLES, muscleGroupOf } from '@shared/schemas/muscles';
import { describe, expect, it } from 'vitest';

describe('muscle registry', () => {
  it('has unique ids and a view for every muscle', () => {
    expect(new Set(MUSCLE_IDS).size).toBe(MUSCLES.length);
    expect(MUSCLES.every((muscle) => muscle.views.length > 0)).toBe(true);
  });

  it('puts every muscle in exactly one group', () => {
    const grouped = MUSCLE_GROUPS.flatMap((group) => [...group.muscles]);
    expect([...grouped].sort()).toEqual([...MUSCLE_IDS].sort());
    expect(muscleGroupOf('lats')).toBe('back');
    expect(muscleGroupOf('quads-outer')).toBe('legs');
  });
});

describe('groupMuscleLoad', () => {
  it('sums each group and counts its trained muscles', () => {
    const groups = groupMuscleLoad({ quads: 6, glutes: 3, 'rear-deltoid': 1.5 });
    expect(groups.find((entry) => entry.group === 'legs')).toEqual({ group: 'legs', load: 9, trained: 2, total: 6 });
    expect(groups.find((entry) => entry.group === 'shoulders')).toEqual({
      group: 'shoulders',
      load: 1.5,
      trained: 1,
      total: 4,
    });
    expect(groups.find((entry) => entry.group === 'chest')?.load).toBe(0);
  });
});

describe('ExerciseMusclesSchema', () => {
  it('requires a primary muscle', () => {
    expect(ExerciseMusclesSchema.safeParse([{ muscle: 'biceps', role: 'secondary' }]).success).toBe(false);
    expect(ExerciseMusclesSchema.safeParse([]).success).toBe(false);
  });

  it('rejects the same muscle twice', () => {
    const result = ExerciseMusclesSchema.safeParse([
      { muscle: 'chest', role: 'primary' },
      { muscle: 'chest', role: 'secondary' },
    ]);
    expect(result.success).toBe(false);
  });

  it('accepts a primary with secondaries', () => {
    const result = ExerciseMusclesSchema.safeParse([
      { muscle: 'chest', role: 'primary' },
      { muscle: 'triceps', role: 'secondary' },
    ]);
    expect(result.success).toBe(true);
  });
});

describe('computeMuscleLoad', () => {
  it('weights sets by role and sums across exercises', () => {
    const load = computeMuscleLoad([
      {
        sets: 4,
        muscles: [
          { muscle: 'chest', role: 'primary' },
          { muscle: 'triceps', role: 'secondary' },
        ],
      },
      { sets: 3, muscles: [{ muscle: 'triceps', role: 'primary' }] },
    ]);
    expect(load).toEqual({ chest: 4, triceps: 5 });
  });

  it('leaves untouched muscles out', () => {
    expect(computeMuscleLoad([])).toEqual({});
  });
});

describe('heatStep', () => {
  it('maps no work to 0 and the peak to the top step', () => {
    expect(heatStep(undefined, 10)).toBe(0);
    expect(heatStep(0, 10)).toBe(0);
    expect(heatStep(10, 10)).toBe(HEAT_STEPS);
  });

  it('never rounds real work down to 0', () => {
    expect(heatStep(0.1, 100)).toBe(1);
  });

  it('returns 0 when there is no peak', () => {
    expect(heatStep(5, 0)).toBe(0);
  });
});

describe('rankMuscles', () => {
  it('orders by load, then by registry order for ties', () => {
    const ranked = rankMuscles({ lats: 2, chest: 2, biceps: 5 });
    expect(ranked.map((entry) => entry.muscle)).toEqual(['biceps', 'chest', 'lats']);
  });
});

const BENCH = { id: 'bench', isAvailable: false };
const BARBELL = { id: 'barbell', isAvailable: true };

const exercises = [
  {
    id: 'press',
    muscles: [
      { muscle: 'chest', role: 'primary' },
      { muscle: 'triceps', role: 'secondary' },
    ],
    isAvailable: false,
    equipment: [BENCH, BARBELL],
  },
  {
    id: 'push-up',
    muscles: [{ muscle: 'chest', role: 'primary' }],
    isAvailable: true,
    equipment: [],
  },
  {
    id: 'curl',
    muscles: [{ muscle: 'biceps', role: 'primary' }],
    isAvailable: true,
    equipment: [BARBELL],
  },
] as const;

describe('computeMuscleCoverage', () => {
  it('counts total, available and lost per muscle', () => {
    const coverage = computeMuscleCoverage(exercises);
    const chest = coverage.find((entry) => entry.muscle === 'chest');
    expect(chest).toMatchObject({ total: 2, available: 1, lost: 1, weight: 2, availableWeight: 1 });
    const triceps = coverage.find((entry) => entry.muscle === 'triceps');
    expect(triceps).toMatchObject({ total: 1, available: 0, lost: 1, weight: 0.5, availableWeight: 0 });
  });

  it('reports every muscle, including ones nothing trains', () => {
    const coverage = computeMuscleCoverage(exercises);
    expect(coverage).toHaveLength(MUSCLE_IDS.length);
    expect(coverage.find((entry) => entry.muscle === 'calves')).toMatchObject({ total: 0, lost: 0 });
  });
});

describe('computeEquipmentImpact', () => {
  it('lists the lost exercises and muscles of a piece that is down', () => {
    const impact = computeEquipmentImpact(exercises);
    expect(impact).toEqual([{ equipmentId: 'bench', exerciseIds: ['press'], muscles: ['chest', 'triceps'] }]);
  });

  it('ignores an unavailable piece whose exercise still has another piece standing in', () => {
    const impact = computeEquipmentImpact([
      {
        id: 'row',
        muscles: [{ muscle: 'lats', role: 'primary' }],
        isAvailable: true,
        equipment: [BENCH, BARBELL],
      },
    ]);
    expect(impact).toEqual([]);
  });
});
