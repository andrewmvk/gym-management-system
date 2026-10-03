import { endOfLocalDay, localDateString, startOfLocalDay } from '@api/lib/dates';
import { findCheckInTimes, findLatestGoals, findPlanExercisesInRange } from '@api/modules/metrics/repository';
import { computeMuscleLoad, type MuscleLoad } from '@cadence/shared/schemas/muscle-heat';

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
    muscleLoad: MuscleLoad;
  };
  trainingVolume: number;
  goalProgress: {
    plannedExercises: number;
    completedExercises: number;
    completionRate: number;
    goals: string | null;
  };
}

export interface MemberWeek {
  trainedDates: string[];
  lastCheckInAt: Date | null;
}

// The days of a range with at least one check-in, plus the latest check-in instant: what the member's
// Now screen needs to say "you're in" and to draw the week. Same rule as days trained (FR-36).
export async function getMemberWeek(userId: string, from: string, to: string): Promise<MemberWeek> {
  const times = await findCheckInTimes(userId, startOfLocalDay(from), endOfLocalDay(to));
  const latest = times.reduce<Date | null>((current, time) => (!current || time > current ? time : current), null);
  return { trainedDates: [...new Set(times.map(localDateString))].sort(), lastCheckInAt: latest };
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
      muscleLoad: computeMuscleLoad(completed),
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
