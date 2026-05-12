import type { TickScope } from "../TickScope";

/**
 * Returns true when a subscriber with `key` should re-fetch after a
 * broadcast with `scope`. Intersection rules:
 *
 *   - wildcard scope (`{ table: "*" }`) matches every key
 *   - empty key matches every scope (subscriber wants everything)
 *   - key[0] === "*" matches every scope (explicit wildcard)
 *   - key[0] must equal scope.table; otherwise no match
 *   - if scope has no `ids`, all rows in that table match
 *   - if scope has `ids`:
 *       - key length 1 (just the table) still matches
 *       - key[1] must be in `scope.ids`
 */
export function keyMatchesScope(
  key: readonly unknown[],
  scope: TickScope,
): boolean {
  if (scope.table === "*") return true;
  if (key.length === 0) return true;

  const first = key[0];
  if (first === "*") return true;
  if (first !== scope.table) return false;

  if (!scope.ids) return true;
  if (key.length === 1) return true;

  const second = key[1];
  if (typeof second !== "string" && typeof second !== "number") return true;
  return scope.ids.includes(second);
}
