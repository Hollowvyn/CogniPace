import type { StudyState } from "@features/study";

/** Empty baseline `StudyState` used by the FSRS scheduler when a
 *  problem has no prior review history. v6 shape (slim — no
 *  `lastReviewedAt`); the v7 expanded shape lives in
 *  `@features/study/createDefaultStudyState`. */
export function createDefaultStudyState(): StudyState {
  return {
    suspended: false,
    tags: [],
    attemptHistory: [],
  };
}
