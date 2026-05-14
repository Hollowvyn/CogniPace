/**
 * LeetCode difficulty primitives — the `Difficulty` value type and a
 * pure parser for raw labels. Lives in libs so screen-parsing and
 * runtime-rpc validators can speak in `Difficulty` without violating
 * the libs→features boundary.
 */
export type Difficulty = "Easy" | "Medium" | "Hard" | "Unknown";

/** Parses a raw difficulty label into the supported domain union. */
export function parseDifficulty(input?: string): Difficulty {
  if (!input) return "Unknown";
  const normalized = input.trim().toLowerCase();
  if (normalized.includes("easy")) return "Easy";
  if (normalized.includes("medium")) return "Medium";
  if (normalized.includes("hard")) return "Hard";
  return "Unknown";
}
