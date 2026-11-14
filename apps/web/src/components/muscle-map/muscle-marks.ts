import type { Locale } from '@cadence/shared/schemas/locale';
import { heatStep, type MuscleLoad, peakLoad } from '@cadence/shared/schemas/muscle-heat';
import { MUSCLE_IDS } from '@cadence/shared/schemas/muscles';
import type { MuscleMarks } from '@/components/muscle-map/muscle-map';
import { formatNumber } from '@/lib/format';

export function marksFromLoad(load: MuscleLoad): MuscleMarks {
  const peak = peakLoad(load);
  const marks: MuscleMarks = {};
  for (const muscle of MUSCLE_IDS) {
    marks[muscle] = { step: heatStep(load[muscle], peak) };
  }
  return marks;
}

// Secondary muscles count half, so a load can end in .5 (written 2,5 in Portuguese).
export function formatSets(locale: Locale, value: number): string {
  return formatNumber(locale, value, {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  });
}
