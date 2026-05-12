
import type { ProblemView } from "./ProblemView";
import type { StudyStateView } from "./StudyStateView";
import type { TrackMembership } from "./TrackMembership";
import type { Problem } from "../types/Problem";

export interface LibraryProblemRow {
  /** Legacy v6 entity — kept until Phase F.3 cleanup; UI uses `view`. */
  problem: Problem;
  /** v7 hydrated view of the problem (topic/company names resolved). */
  view: ProblemView;
  /** v7 — consolidated UI-ready view of the StudyState. Single source of
   * truth for FSRS metrics, attempt history, log fields, tags, etc. */
  studyState: StudyStateView | null;
  /** Track memberships (Tracks whose groups list this slug). The single
   * source of truth for "which curated lists contain this problem". */
  trackMemberships: TrackMembership[];
  /** Combined queue-skip flag with reason. Computed from
   * `studyState.suspended` (manual), premium-when-skipPremium-on, or
   * both at once. */
  suspended?: "manual" | "premium" | "both";
}
