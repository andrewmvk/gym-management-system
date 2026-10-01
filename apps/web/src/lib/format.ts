// Plan dates are calendar days (YYYY-MM-DD) with no time zone, so they're parsed as local midnight.
export function formatPlanDate(isoDate: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, options);
}

export function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
