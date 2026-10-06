import { addDays, startOfMonth, toIsoDate } from '@/lib/calendar-date';

export interface WeekDay {
  iso: string;
  date: Date;
}

// Monday to Sunday of the week that contains `now`, in local time.
export function currentWeek(now: Date = new Date()): WeekDay[] {
  const monday = addDays(now, -((now.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, index);
    return { iso: toIsoDate(date), date };
  });
}

// Every Monday-to-Sunday row that touches the month of `now`, so the first and last rows are whole weeks.
export function monthWeeks(now: Date = new Date()): WeekDay[][] {
  const lastSunday = currentWeek(new Date(now.getFullYear(), now.getMonth() + 1, 0))[6]!.date;
  const weeks: WeekDay[][] = [];
  for (let monday = currentWeek(startOfMonth(now))[0]!.date; monday <= lastSunday; monday = addDays(monday, 7)) {
    weeks.push(currentWeek(monday));
  }
  return weeks;
}
