/**
 * Shared types for the `ProblemsTable` family. Kept separate from the
 * components so the controller hook + tests can import the shapes
 * without pulling React/MUI in.
 */
import type {
  CompanyId,
  ProblemSlug,
  SetGroupId,
  StudySetId,
  TopicId,
} from "../../../domain/common/ids";
import type { ProblemView, StudyStateView } from "../../../domain/views";
import type { Difficulty, StudyPhase } from "../../../domain/types";

/** A single row passed to the table. */
export interface ProblemRowData {
  view: ProblemView;
  studyState: StudyStateView | null;
  trackMemberships: ReadonlyArray<{
    trackId: StudySetId;
    trackName: string;
    groupId?: SetGroupId;
    groupName?: string;
  }>;
  /** Combined flag: true when the problem is queue-skipped — either
   * the user manually suspended it, or `skipPremium` is on and the
   * problem is premium-locked. UI uses this to render a Suspended
   * badge regardless of the underlying reason. */
  suspended?: SuspendedReason;
}

/** Why a row reads as suspended. `manual` = user clicked Suspend.
 * `premium` = settings.skipPremium is on and isPremium is true.
 * `both` = manually suspended *and* premium-and-skipPremium. */
export type SuspendedReason = "manual" | "premium" | "both";

/** Sortable column key. */
export type SortKey =
  | "title"
  | "difficulty"
  | "phase"
  | "nextReview"
  | "lastReviewed";

/** Sort direction. */
export type SortDirection = "asc" | "desc";

/** Filter state for the table toolbar. */
export interface ProblemsTableFilters {
  query: string;
  difficulty: Difficulty | "all";
  phase: StudyPhase | "all";
}

/** Default filter values. */
export function createDefaultFilters(): ProblemsTableFilters {
  return { query: "", difficulty: "all", phase: "all" };
}

/** Allowed pagination sizes — fixed per the plan. */
export const ROWS_PER_PAGE_OPTIONS = [20, 30, 50] as const;
export type RowsPerPage = (typeof ROWS_PER_PAGE_OPTIONS)[number];

export type ProblemSelection = ReadonlySet<ProblemSlug>;

// Re-export brands the consumer is likely to need.
export type { CompanyId, ProblemSlug, StudySetId, SetGroupId, TopicId };
