/** Problem difficulty parsing and difficulty-derived study heuristics. */
import { Difficulty } from "../types";

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
export function difficultyGoalMs(difficulty: Difficulty): number {
  if (difficulty === "Easy") {
    return 20 * 60 * 1000;
  }
  if (difficulty === "Medium") {
    return 35 * 60 * 1000;
  }
  if (difficulty === "Hard") {
    return 50 * 60 * 1000;
  }
  return 30 * 60 * 1000;
}
