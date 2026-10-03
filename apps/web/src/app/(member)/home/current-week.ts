import { addDays, toIsoDate } from '@/lib/calendar-date';

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
