/** Problem difficulty parsing and difficulty-derived study heuristics. */
import { Difficulty, DifficultyGoalSettings } from "../types";

export const UNKNOWN_DIFFICULTY_GOAL_MS = 30 * 60 * 1000;

/** Parses a raw difficulty label into the supported domain difficulty union. */
export function parseDifficulty(input?: string): Difficulty {
  if (!input) {
    return "Unknown";
  }

  const normalized = input.trim().toLowerCase();
  if (normalized.includes("easy")) {
    return "Easy";
  }
  if (normalized.includes("medium")) {
    return "Medium";
  }
  if (normalized.includes("hard")) {
    return "Hard";
  }
  return "Unknown";
}

/** Returns the baseline solve-time goal used by the overlay quick-rating heuristics. */
export function difficultyGoalMs(
  difficulty: Difficulty,
  goals?: DifficultyGoalSettings
): number {
  if (difficulty === "Easy") {
    return goals?.Easy ?? 20 * 60 * 1000;
  }
  if (difficulty === "Medium") {
    return goals?.Medium ?? 35 * 60 * 1000;
  }
  if (difficulty === "Hard") {
    return goals?.Hard ?? 50 * 60 * 1000;
  }
  return UNKNOWN_DIFFICULTY_GOAL_MS;
}
