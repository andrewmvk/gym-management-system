import { endOfLocalDay, startOfLocalDay, todayLocal } from '@api/lib/dates';
import { isExerciseAvailable } from '@api/modules/catalog/service';
import * as repository from '@api/modules/gym/repository';
import {
  type DayHours,
  OCCUPANCY_WINDOW_MINUTES,
  type OpeningHours,
  OpeningHoursSchema,
  WEEKDAYS,
  type Weekday,
} from '@cadence/shared/schemas/gym';

const MS_PER_MINUTE = 60 * 1000;
const HOURS_PER_DAY = 24;

export interface DemandEntry {
  name: string;
  count: number;
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours! * 60 + minutes!;
}

// The closing minute itself is already closed: open is [open, close).
export function isOpenAt(hours: DayHours | null, now: Date) {
  if (!hours) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= toMinutes(hours.open) && minutes < toMinutes(hours.close);
}

export interface NextChange {
  event: 'opens' | 'closes';
  day: 'today' | 'tomorrow' | Weekday;
  time: string;
}

// What a visitor wants to know next: when it closes if open, otherwise the next time it opens.
export function getNextChange(openingHours: OpeningHours, now: Date): NextChange | null {
  const todayIndex = now.getDay();
  const today = openingHours[WEEKDAYS[todayIndex]!];
  if (today && isOpenAt(today, now)) return { event: 'closes', day: 'today', time: today.close };
  if (today && now.getHours() * 60 + now.getMinutes() < toMinutes(today.open)) {
    return { event: 'opens', day: 'today', time: today.open };
  }
  for (let offset = 1; offset <= WEEKDAYS.length; offset++) {
    const weekday = WEEKDAYS[(todayIndex + offset) % WEEKDAYS.length]!;
    const hours = openingHours[weekday];
    if (hours) return { event: 'opens', day: offset === 1 ? 'tomorrow' : weekday, time: hours.open };
  }
  return null;
}

function tally(names: string[]): DemandEntry[] {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

// Today's published plans of members who checked in today. An exercise whose equipment is all
// unavailable is skipped entirely, and so is any unavailable piece of equipment of one that is not.
async function getDemandToday(now: Date) {
  const today = todayLocal(now);
  const planned = await repository.findPlannedExercisesOfCheckedInMembers(
    today,
    startOfLocalDay(today),
    endOfLocalDay(today),
  );
  const equipmentRows = await repository.findEquipmentForExercises([...new Set(planned.map((row) => row.exerciseId))]);

  const equipmentByExercise = new Map<string, typeof equipmentRows>();
  for (const row of equipmentRows) {
    equipmentByExercise.set(row.exerciseId, [...(equipmentByExercise.get(row.exerciseId) ?? []), row]);
  }

  const muscleGroups: string[] = [];
  const equipment: string[] = [];
  for (const row of planned) {
    const linked = equipmentByExercise.get(row.exerciseId) ?? [];
    if (!isExerciseAvailable(linked)) continue;
    muscleGroups.push(row.muscleGroup);
    for (const item of linked) if (item.isAvailable) equipment.push(item.name);
  }
  return { muscleGroups: tally(muscleGroups), equipment: tally(equipment) };
}

// The clock is injectable so the window and the opening edges are testable without waiting.
export async function getGymInfo(now: Date = new Date()) {
  const settings = await repository.getOrCreateSettings();
  const openingHours = OpeningHoursSchema.parse(settings.openingHours);
  const todayHours = openingHours[WEEKDAYS[now.getDay()]!];
  const windowStart = new Date(now.getTime() - OCCUPANCY_WINDOW_MINUTES * MS_PER_MINUTE);

  return {
    isOpen: isOpenAt(todayHours, now),
    todayHours,
    nextChange: getNextChange(openingHours, now),
    occupancyEstimate: await repository.countCheckInsBetween(windowStart, now),
    isEstimate: true as const,
    occupancyWindowMinutes: OCCUPANCY_WINDOW_MINUTES,
    demand: await getDemandToday(now),
  };
}

export async function getGymAdminDetail(now: Date = new Date()) {
  const today = todayLocal(now);
  const times = await repository.findCheckInTimes(startOfLocalDay(today), endOfLocalDay(today));
  const checkInsPerHour = Array.from({ length: HOURS_PER_DAY }, (_, hour) => ({
    hour,
    count: times.filter((time) => time.getHours() === hour).length,
  }));
  return { ...(await getGymInfo(now)), checkInsPerHour, currentHour: now.getHours() };
}
