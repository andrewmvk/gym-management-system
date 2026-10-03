import { endOfLocalDay, localDateString, startOfLocalDay } from '@api/lib/dates';
import { findCheckInTimes, findLatestGoals, findPlanExercisesInRange } from '@api/modules/metrics/repository';

const DAYS_PER_WEEK = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface BreakdownEntry {
  name: string;
  completed: number;
}

export interface MemberMetrics {
  from: string;
  to: string;
  daysTrained: number;
  trainingFrequency: number;
  exerciseBreakdown: {
    byExercise: BreakdownEntry[];
    byMuscleGroup: BreakdownEntry[];
  };
  trainingVolume: number;
  goalProgress: {
    plannedExercises: number;
    completedExercises: number;
    completionRate: number;
    goals: string | null;
  };
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function countBy(names: string[]): BreakdownEntry[] {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, completed]) => ({ name, completed }))
    .sort((a, b) => b.completed - a.completed || a.name.localeCompare(b.name));
}

// FR-36: everything is computed from the tables on each call, nothing is stored. "Days trained" counts distinct
// local calendar days with a check-in and only that; exercises marked completed never add a day.
export async function getMemberMetrics(userId: string, from: string, to: string): Promise<MemberMetrics> {
  const start = startOfLocalDay(from);
  const end = endOfLocalDay(to);

  const [checkInTimes, planExercises, goals] = await Promise.all([
    findCheckInTimes(userId, start, end),
    findPlanExercisesInRange(userId, from, to),
    findLatestGoals(userId),
  ]);

  const daysTrained = new Set(checkInTimes.map(localDateString)).size;
  // Rounded because a local day is 23 or 25 hours long across a daylight saving change.
  const rangeDays = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
  const trainingFrequency = round(daysTrained / (rangeDays / DAYS_PER_WEEK), 2);

  const completed = planExercises.filter((exercise) => exercise.completed);
  const trainingVolume = completed.reduce((total, exercise) => total + exercise.sets * exercise.reps, 0);

  return {
    from,
    to,
    daysTrained,
    trainingFrequency,
    exerciseBreakdown: {
      byExercise: countBy(completed.map((exercise) => exercise.exerciseName)),
      byMuscleGroup: countBy(completed.map((exercise) => exercise.muscleGroup)),
    },
    trainingVolume,
    goalProgress: {
      plannedExercises: planExercises.length,
      completedExercises: completed.length,
      completionRate: planExercises.length === 0 ? 0 : round(completed.length / planExercises.length, 4),
      goals,
    },
  };
}
