import type { AttemptHistoryEntry , Rating , ReviewLogFields , StudyStateSummary } from "@features/study";

/**
 * Consolidated UI-ready view of a StudyState. Composes the FSRS-derived
 * summary (phase, stability, retrievability, …) with the user-facing
 * log fields (notes, pattern, complexities) and a pre-sliced
 * recent-attempts list. Mirrors `ProblemView`'s role for Problem — the
 * single shape every UI surface needs from a StudyState. Built via
 * `buildStudyStateView` in `domain/views/utils/hydrate.ts`.
 */
export interface StudyStateView extends StudyStateSummary, ReviewLogFields {
  /** Last N attempt history entries (newest last). Empty for fresh problems. */
  recentAttempts: AttemptHistoryEntry[];
  /** Personal scratch tags from `StudyState.tags`. */
  tags: string[];
  /** Best recorded solve time across all attempts, in ms. */
  bestTimeMs?: number;
  /** Most recent solve time, in ms. */
  lastSolveTimeMs?: number;
  /** Most recent rating (0=Again, 1=Hard, 2=Good, 3=Easy). */
  lastRating?: Rating;
  /** Optional self-reported confidence, scale defined by the user. */
  confidence?: number;
}
