import type { Locale } from '@cadence/shared/schemas/locale';
import { intlLocale } from '@/lib/i18n/translate';

// Plan dates are calendar days (YYYY-MM-DD) with no time zone, so they're parsed as local midnight.
export function formatPlanDate(
  locale: Locale,
  isoDate: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(intlLocale(locale), options);
}

// A weight is a number of kilograms and is always written with its unit. Entries saved before weights were
// numbers can still hold the text that was typed, which is shown as it was.
export function formatWeight(load: number | string): string {
  return typeof load === 'number' ? `${load} kg` : load;
}

export function formatDateTime(locale: Locale, value: string | Date) {
  return new Date(value).toLocaleString(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(locale: Locale, value: Date, options: Intl.DateTimeFormatOptions) {
  return value.toLocaleDateString(intlLocale(locale), options);
}

export function formatTime(locale: Locale, value: string | Date) {
  return new Date(value).toLocaleTimeString(intlLocale(locale), { hour: '2-digit', minute: '2-digit' });
}

export function formatNumber(locale: Locale, value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(intlLocale(locale), options).format(value);
}
