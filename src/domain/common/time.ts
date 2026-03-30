/** Shared time and date formatting helpers used across domain and UI layers. */

/** Returns the current timestamp in ISO-8601 format. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Adds whole days to an ISO timestamp and returns the updated ISO string. */
export function addDaysIso(fromIso: string, days: number): string {
  const date = new Date(fromIso);
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

/** Formats elapsed milliseconds as `mm:ss` or `hh:mm:ss`. */
export function formatClock(totalMs: number): string {
  const safeMs = Math.max(0, Math.floor(totalMs));
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/** Returns a copy of the provided date at local start-of-day. */
export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Formats a date into a stable `YYYY-MM-DD` key. */
export function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}
