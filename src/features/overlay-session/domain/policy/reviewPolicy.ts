/**
 * Review policy helpers used by the overlay quick-submit UX.
 *
 * Lives in overlay-session because it's UX policy specific to how the
 * overlay surfaces FSRS scheduling — not core FSRS scheduling logic.
 * Keeping it here lets the policy reference difficulty goals from the
 * problems and settings features directly; the libs/fsrs/ folder stays
 * pure (no cross-feature imports).
 */
import { difficultyGoalMs } from "@features/problems";
import { getStudyStateSummary } from "@libs/fsrs/studyState";

import type { Difficulty } from "@features/problems";
import type { DifficultyGoalSettings } from "@features/settings";
import type { Rating, ReviewMode, StudyState } from "@features/study";

/** Selects the default review mode based on whether the problem has prior review history. */
export function defaultReviewMode(
  state: StudyState | null | undefined,
): ReviewMode {
  return getStudyStateSummary(state ?? null).reviewCount > 0
    ? "RECALL"
    : "FULL_SOLVE";
}

/** Derives the default quick rating from the recorded solve time and difficulty target. */
export function deriveQuickRating(
  elapsedMs: number | undefined,
  goalMs: number,
  hardMode = false,
): Rating {
  if (!elapsedMs || elapsedMs <= 0) {
    return 2;
  }

  if (elapsedMs <= goalMs) {
    return 2;
  }

  return hardMode ? 0 : 1;
}

/** Returns the target solve-time budget for a given difficulty. */
export function goalForDifficulty(
  difficulty: Difficulty,
  goals?: DifficultyGoalSettings,
): number {
  return difficultyGoalMs(difficulty, goals);
}
