import { endOfLocalDay, startOfLocalDay, todayLocal } from '@api/lib/dates';
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
    occupancyEstimate: await repository.countMembersCheckedInBetween(windowStart, now),
    isEstimate: true as const,
    occupancyWindowMinutes: OCCUPANCY_WINDOW_MINUTES,
  };
}

// Each bucket counts distinct members, so a re-scan inside the same hour is not a second visitor.
export async function getGymAdminDetail(now: Date = new Date()) {
  const today = todayLocal(now);
  const checkIns = await repository.findCheckIns(startOfLocalDay(today), endOfLocalDay(today));
  const membersPerHour = Array.from({ length: HOURS_PER_DAY }, () => new Set<string>());
  for (const checkIn of checkIns) membersPerHour[checkIn.checkedInAt.getHours()]!.add(checkIn.userId);
  const checkInsPerHour = membersPerHour.map((members, hour) => ({ hour, count: members.size }));
  return { ...(await getGymInfo(now)), checkInsPerHour, currentHour: now.getHours() };
}

export async function getOpeningHours(): Promise<OpeningHours> {
  return OpeningHoursSchema.parse((await repository.getOrCreateSettings()).openingHours);
}

export async function updateOpeningHours(openingHours: OpeningHours): Promise<OpeningHours> {
  const settings = await repository.updateOpeningHours(openingHours);
  return OpeningHoursSchema.parse(settings.openingHours);
}
