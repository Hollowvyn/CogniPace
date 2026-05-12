import type { UserSettings } from "./UserSettings";

/** Stable JSON stringify with sorted keys — `JSON.stringify` doesn't
 *  guarantee key order, so we sort to make value-equality reliable. */
function stableStringify(value: unknown): string {
  if (!value || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([left], [right]) => left.localeCompare(right),
  );

  return `{${entries
    .map(
      ([key, entryValue]) =>
        `${JSON.stringify(key)}:${stableStringify(entryValue)}`,
    )
    .join(",")}}`;
}

/** Deep value equality between two UserSettings snapshots. Used by the
 *  settings editor to decide whether the user has unsaved changes. */
export function areUserSettingsEqual(
  left: UserSettings,
  right: UserSettings,
): boolean {
  return stableStringify(left) === stableStringify(right);
}
