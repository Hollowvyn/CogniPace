/** UI-presentation helpers for the tracks feature. */

/** Formats enum-like status values for simple human-readable labels.
 *  e.g. "DUE_NOW" → "DUE NOW". */
export function labelForStatus(value: string): string {
  return value.replace(/_/g, " ");
}
