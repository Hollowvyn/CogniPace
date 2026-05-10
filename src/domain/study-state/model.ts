/**
 * StudyState aggregate — captures *how the user is learning* a problem
 * (FSRS card snapshot, attempt history, suspended flag, personal tags,
 * solve times). Decoupled from Problem: a Problem can exist with no
 * StudyState; StudyState is created lazily on first review.
 *
 * Invariant (asserted at runtime in studyStateRepository):
 *   `attemptHistory.length > 0 ⇔ lastRating !== undefined`
 * Type-level enforcement would force a `lastAttempt?` bag refactor; the
 * runtime assert is sufficient for the cost.
 */
import type {
  AttemptHistoryEntry,
  FsrsCardSnapshot,
  Rating,
  ReviewLogFields,
} from "../types";

export interface StudyState extends ReviewLogFields {
  suspended: boolean;
  bestTimeMs?: number;
  lastSolveTimeMs?: number;
  lastRating?: Rating;
  confidence?: number;
  /** Personal scratch tags — distinct from the canonical Topic registry. */
  tags: string[];
  attemptHistory: AttemptHistoryEntry[];
  fsrsCard?: FsrsCardSnapshot;
  readonly createdAt: string;
  updatedAt: string;
}
