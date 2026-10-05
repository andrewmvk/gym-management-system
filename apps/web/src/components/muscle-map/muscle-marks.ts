import { heatStep, type MuscleLoad, peakLoad } from '@cadence/shared/schemas/muscle-heat';
import { MUSCLE_IDS } from '@cadence/shared/schemas/muscles';
import type { MuscleMarks } from '@/components/muscle-map/muscle-map';

export function marksFromLoad(load: MuscleLoad): MuscleMarks {
  const peak = peakLoad(load);
  const marks: MuscleMarks = {};
  for (const muscle of MUSCLE_IDS) {
    marks[muscle] = { step: heatStep(load[muscle], peak) };
  }
  return marks;
}

// Secondary muscles count half, so a load can end in .5.
export function formatSets(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
