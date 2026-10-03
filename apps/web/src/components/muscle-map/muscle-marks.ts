import { heatStep, type MuscleLoad, peakLoad } from '@cadence/shared/schemas/muscle-heat';
import { MUSCLE_IDS, type MuscleId } from '@cadence/shared/schemas/muscles';
import type { MuscleMarks } from '@/components/muscle-map/muscle-map';

export type MuscleFocusMap = Partial<Record<MuscleId, number>>;

export function marksFromLoad(load: MuscleLoad, focus: MuscleFocusMap = {}): MuscleMarks {
  const peak = peakLoad(load);
  const marks: MuscleMarks = {};
  for (const muscle of MUSCLE_IDS) {
    marks[muscle] = { step: heatStep(load[muscle], peak), bias: focus[muscle] };
  }
  return marks;
}

export function focusToMap(focus: readonly { muscle: MuscleId; bias: number }[]): MuscleFocusMap {
  return Object.fromEntries(focus.map((entry) => [entry.muscle, entry.bias]));
}

// Secondary muscles count half, so a load can end in .5.
export function formatSets(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
