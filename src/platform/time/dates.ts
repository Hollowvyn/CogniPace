/** Pure date/time formatting helpers. No system-clock reads; safe to
 *  call from anywhere without injection. Lives alongside the `Clock`
 *  port since "time" is the conceptual home. */

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

function formatMonthDay(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatMonthDayYear(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatWeekday(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
  }).format(date);
}

export function calendarDayDistance(date: Date, relativeTo: Date): number {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.round(
    (startOfDay(date).getTime() - startOfDay(relativeTo).getTime()) / dayMs,
  );
}

export function formatRelativeCalendarDate(
  iso?: string,
  relativeTo = new Date(),
  fallback = "-",
): string {
  if (!iso) return fallback;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return fallback;

  const difference = calendarDayDistance(date, relativeTo);
  if (difference === 0) return "today";
  if (difference === 1) return "tomorrow";
  if (difference === -1) return "yesterday";
  if (difference >= 2 && difference <= 6) {
    return `this ${formatWeekday(date)}`;
  }
  if (difference <= -2 && difference >= -6) {
    return `last ${formatWeekday(date)}`;
  }
  if (date.getFullYear() === relativeTo.getFullYear()) {
    return formatMonthDay(date);
  }

  return formatMonthDayYear(date);
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
