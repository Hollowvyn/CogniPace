/** Re-exports for the FSRS lib's internal consumers (scheduler,
 *  studyState). libs cannot import from features in general; this file
 *  is an exempted leak (see `LIBS_FEATURE_TYPE_LEAKS` in
 *  tests/architecture/boundaries.test.ts) — the FSRS scheduler is a
 *  pure function over StudyState + UserSettings, all of which live in
 *  features. The proper long-term fix is to invert ownership (StudyState
 *  lives in libs, features/study re-exports). */
export type {
  AttemptHistoryEntry,
  FsrsCardSnapshot,
  Rating,
  ReviewLogFields,
  ReviewMode,
  StudyPhase,
  StudyState,
  StudyStateSummary,
} from "@features/study";
export { createDefaultStudyState } from "@features/study";
export type { Difficulty } from "@features/problems";
export type { UserSettings } from "@features/settings";
