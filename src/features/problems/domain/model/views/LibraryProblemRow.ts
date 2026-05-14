import type { ProblemView } from "./ProblemView";
import type { StudyStateView } from "@features/study";
import type { TrackMembership } from "@features/tracks";

export interface LibraryProblemRow {
  /** Hydrated view of the problem (topic/company names resolved). */
  view: ProblemView;
  /** UI-ready view of the StudyState. Single source of truth for FSRS
   *  metrics, attempt history, log fields, tags, etc. */
  studyState: StudyStateView | null;
  /** Track memberships (Tracks whose groups list this slug). The single
   *  source of truth for "which curated lists contain this problem". */
  trackMemberships: TrackMembership[];
  /** Combined queue-skip flag with reason. Computed from
   *  `studyState.suspended` (manual), premium-when-skipPremium-on, or
   *  both at once. */
  suspended?: "manual" | "premium" | "both";
}
