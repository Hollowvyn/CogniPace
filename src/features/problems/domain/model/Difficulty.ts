/** Difficulty value type + `parseDifficulty` re-exported from
 *  `@libs/leetcode`. Settings-aware `difficultyGoalMs` stays in the
 *  features layer (it depends on a settings-feature type). */
import type { DifficultyGoalSettings } from "@features/settings";
import type { Difficulty } from "@libs/leetcode";

export { parseDifficulty, type Difficulty } from "@libs/leetcode";

/** Baseline solve-time goal used by the overlay quick-rating heuristics. */
export function difficultyGoalMs(
  difficulty: Difficulty,
  goals?: DifficultyGoalSettings,
): number {
  if (difficulty === "Easy") return goals?.Easy ?? 20 * 60 * 1000;
  if (difficulty === "Medium") return goals?.Medium ?? 35 * 60 * 1000;
  return goals?.Hard ?? 50 * 60 * 1000;
}
