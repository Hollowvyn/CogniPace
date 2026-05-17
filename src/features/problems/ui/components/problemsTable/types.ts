import type { Difficulty, Problem } from "../../../domain/model";
import type { UserSettings } from "@features/settings";
import type { StudyPhase } from "@features/study";
import type { Track } from "@features/tracks";
import type {
  CompanyId,
  ProblemSlug,
  TopicId,
  TrackGroupId,
  TrackId,
} from "@shared/ids";

export type SuspendedReason = "manual" | "premium" | "both";

/** Sortable column key. */
export type SortKey =
  | "source"
  | "title"
  | "difficulty"
  | "phase"
  | "nextReview"
  | "lastReviewed";

/** Sort direction. */
export type SortDirection = "asc" | "desc";

export interface ProblemTableSort {
  key: SortKey;
  direction: SortDirection;
}

/** Filter state for the table toolbar. */
export interface ProblemsTableFilters {
  query: string;
  difficulty: Difficulty | "all";
  phase: StudyPhase | "all";
  trackId: TrackId | "all";
}

/** Default filter values. */
export function createDefaultFilters(): ProblemsTableFilters {
  return { query: "", difficulty: "all", phase: "all", trackId: "all" };
}

/** Allowed pagination sizes — fixed per the plan. */
export const ROWS_PER_PAGE_OPTIONS = [20, 30, 50] as const;
export type RowsPerPage = (typeof ROWS_PER_PAGE_OPTIONS)[number];

export type ProblemSelection = ReadonlySet<ProblemSlug>;

export type ProblemTableActionKind =
  | "open"
  | "suspend"
  | "reset"
  | "premium";

export interface PendingProblemTableAction {
  kind: ProblemTableActionKind;
  slug?: ProblemSlug;
}

export interface ProblemTableCommands {
  openProblem?: (target: {
    slug: string;
    trackId?: string;
    groupId?: string;
  }) => Promise<void> | void;
  suspendProblem?: (slug: ProblemSlug, suspend: boolean) => Promise<void>;
  resetProblemSchedule?: (slug: ProblemSlug) => Promise<void>;
  enablePremiumQuestions?: () => Promise<void>;
  refresh?: () => Promise<void>;
}

export interface ProblemTableInput {
  problems: readonly Problem[];
  settings: UserSettings;
  tracks?: readonly Track[];
  now?: Date;
  commands?: ProblemTableCommands;
}

// Re-export brands the consumer is likely to need.
export type { CompanyId, ProblemSlug, TrackId, TrackGroupId, TopicId };
