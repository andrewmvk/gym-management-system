// Plan dates are calendar days (YYYY-MM-DD) with no time zone, so they're parsed as local midnight.
export function formatPlanDate(
  isoDate: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, options);
}

// A weight is a number of kilograms and is always written with its unit. Entries saved before weights were
// numbers can still hold the text that was typed, which is shown as it was.
export function formatWeight(load: number | string): string {
  return typeof load === 'number' ? `${load} kg` : load;
}

export function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
