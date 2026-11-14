import { addDays, fromIsoDate, toIsoDate } from '@/lib/calendar-date';
import type { I18n } from '@/lib/i18n/i18n-provider';

export type DayRelation = 'past' | 'today' | 'future';

export function relationOf(iso: string, todayIso: string): DayRelation {
  if (iso === todayIso) return 'today';
  return iso < todayIso ? 'past' : 'future';
}

export function shiftIsoDate(iso: string, days: number): string {
  return toIsoDate(addDays(fromIsoDate(iso) ?? new Date(), days));
}

// "Today", "Yesterday" and "Tomorrow" when the day is one of those, nothing for any other day.
function nearbyDayName({ t }: Pick<I18n, 't'>, iso: string, todayIso: string): string | null {
  if (iso === todayIso) return t('Today');
  if (iso === shiftIsoDate(todayIso, -1)) return t('Yesterday');
  if (iso === shiftIsoDate(todayIso, 1)) return t('Tomorrow');
  return null;
}

// The line that names a day: "Today, Monday 5 October", or just the date for a day with no name of its own.
export function describeDay(i18n: Pick<I18n, 't' | 'formatPlanDate'>, iso: string, todayIso: string): string {
  const date = i18n.formatPlanDate(iso, { weekday: 'long', day: 'numeric', month: 'long' });
  const name = nearbyDayName(i18n, iso, todayIso);
  return name ? `${name}, ${date}` : date;
}
