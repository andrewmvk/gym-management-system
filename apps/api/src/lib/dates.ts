// FR-39: every "today"/date computation in the app goes through here, always the server's local
// system timezone - never UTC, never per-user. Every function takes a real Date (or defaults to
// `new Date()`), so a test can inject any instant instead of depending on the real clock.

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function localDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayLocal(now: Date = new Date()): string {
  return localDateString(now);
}

// Noon avoids a daylight-saving jump moving the result across midnight.
export function shiftLocalDate(date: string, days: number): string {
  const shifted = new Date(`${date}T12:00:00`);
  shifted.setDate(shifted.getDate() + days);
  return localDateString(shifted);
}

function parseLocalDateString(dateString: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateString.split('-').map(Number);
  return { year: year!, month: month! - 1, day: day! };
}

// Inclusive start of the given local day.
export function startOfLocalDay(dateString: string): Date {
  const { year, month, day } = parseLocalDateString(dateString);
  return new Date(year, month, day, 0, 0, 0, 0);
}

// Exclusive end of the given local day (the start of the next one).
export function endOfLocalDay(dateString: string): Date {
  const { year, month, day } = parseLocalDateString(dateString);
  return new Date(year, month, day + 1, 0, 0, 0, 0);
}
