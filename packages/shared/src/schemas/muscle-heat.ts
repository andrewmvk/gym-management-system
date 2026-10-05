import {
  type ExerciseMuscle,
  MUSCLE_GROUPS,
  MUSCLE_IDS,
  type MuscleGroupId,
  type MuscleId,
  ROLE_WEIGHT,
} from '@shared/schemas/muscles';

// Raw weighted load per muscle. A muscle with no work is absent, never zero.
export type MuscleLoad = Partial<Record<MuscleId, number>>;

export const HEAT_STEPS = 5;

export interface LoadedExercise {
  sets: number;
  muscles: readonly ExerciseMuscle[];
}

// Each exercise adds its sets times the muscle's role weight, so ten sets of rows outweigh two sets of
// curls and a secondary muscle counts for half a primary one.
export function computeMuscleLoad(exercises: readonly LoadedExercise[]): MuscleLoad {
  const load: MuscleLoad = {};
  for (const exercise of exercises) {
    for (const { muscle, role } of exercise.muscles) {
      load[muscle] = (load[muscle] ?? 0) + exercise.sets * ROLE_WEIGHT[role];
    }
  }
  return load;
}

export function peakLoad(load: MuscleLoad): number {
  return Math.max(0, ...Object.values(load));
}

// 0 means no work. 1 to HEAT_STEPS scale against the busiest muscle, so the map always uses the full
// ramp whatever the absolute volume is.
export function heatStep(value: number | undefined, peak: number): number {
  if (!value || value <= 0 || peak <= 0) return 0;
  return Math.min(HEAT_STEPS, Math.max(1, Math.ceil((value / peak) * HEAT_STEPS)));
}

export function rankMuscles(load: MuscleLoad): { muscle: MuscleId; load: number }[] {
  return MUSCLE_IDS.flatMap((muscle) => {
    const value = load[muscle];
    return value && value > 0 ? [{ muscle, load: value }] : [];
  }).sort((a, b) => b.load - a.load || MUSCLE_IDS.indexOf(a.muscle) - MUSCLE_IDS.indexOf(b.muscle));
}

export interface GroupLoad {
  group: MuscleGroupId;
  load: number;
  // How many of the group's muscles have any work, out of how many it has.
  trained: number;
  total: number;
}

export function groupMuscleLoad(load: MuscleLoad): GroupLoad[] {
  return MUSCLE_GROUPS.map((group) => ({
    group: group.id,
    load: group.muscles.reduce((sum, muscle) => sum + (load[muscle] ?? 0), 0),
    trained: group.muscles.filter((muscle) => (load[muscle] ?? 0) > 0).length,
    total: group.muscles.length,
  }));
}

export interface CoverageExercise {
  id: string;
  muscles: readonly ExerciseMuscle[];
  isAvailable: boolean;
  equipment: readonly { id: string; isAvailable: boolean }[];
}

export interface MuscleCoverage {
  muscle: MuscleId;
  total: number;
  available: number;
  lost: number;
  weight: number;
  availableWeight: number;
}

export function computeMuscleCoverage(exercises: readonly CoverageExercise[]): MuscleCoverage[] {
  return MUSCLE_IDS.map((muscle) => {
    const coverage: MuscleCoverage = { muscle, total: 0, available: 0, lost: 0, weight: 0, availableWeight: 0 };
    for (const exercise of exercises) {
      const entry = exercise.muscles.find((candidate) => candidate.muscle === muscle);
      if (!entry) continue;
      const weight = ROLE_WEIGHT[entry.role];
      coverage.total += 1;
      coverage.weight += weight;
      if (exercise.isAvailable) {
        coverage.available += 1;
        coverage.availableWeight += weight;
      } else {
        coverage.lost += 1;
      }
    }
    return coverage;
  });
}

export interface EquipmentImpact {
  equipmentId: string;
  exerciseIds: string[];
  muscles: MuscleId[];
}

// Only pieces that are down appear. An exercise counts against a piece when it is linked to it and has
// no other piece standing in, which is exactly the FR-17 rule failing for that exercise.
export function computeEquipmentImpact(exercises: readonly CoverageExercise[]): EquipmentImpact[] {
  const byEquipment = new Map<string, CoverageExercise[]>();
  for (const exercise of exercises) {
    if (exercise.isAvailable) continue;
    for (const piece of exercise.equipment) {
      if (piece.isAvailable) continue;
      byEquipment.set(piece.id, [...(byEquipment.get(piece.id) ?? []), exercise]);
    }
  }
  return [...byEquipment].map(([equipmentId, lost]) => ({
    equipmentId,
    exerciseIds: lost.map((exercise) => exercise.id),
    muscles: MUSCLE_IDS.filter((muscle) =>
      lost.some((exercise) => exercise.muscles.some((entry) => entry.muscle === muscle)),
    ),
  }));
}
