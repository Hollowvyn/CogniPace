/** Review policy helpers used by the overlay quick-submit UX. */
import { difficultyGoalMs } from "../problem/difficulty";
import { Difficulty, Rating, ReviewMode, StudyState } from "../types";

import { getStudyStateSummary } from "./studyState";

/** Selects the default review mode based on whether the problem has prior review history. */
export function defaultReviewMode(
  state: StudyState | null | undefined
): ReviewMode {
  return getStudyStateSummary(state ?? null).reviewCount > 0
    ? "RECALL"
    : "FULL_SOLVE";
}

/** Derives the default quick rating from the recorded solve time and difficulty target. */
export function deriveQuickRating(
  elapsedMs: number | undefined,
  goalMs: number
): Rating {
  if (!elapsedMs || elapsedMs <= 0) {
    return 2;
  }

  if (elapsedMs <= goalMs) {
    return 2;
  }

  if (elapsedMs <= goalMs * 1.5) {
    return 1;
  }

  return 0;
}

/** Returns the target solve-time budget for a given difficulty. */
export function goalForDifficulty(difficulty: Difficulty): number {
  return difficultyGoalMs(difficulty);
}
