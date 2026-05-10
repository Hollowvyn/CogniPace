/** UI-facing read models assembled by domain and background use cases. */
import type {
  AnalyticsSummary,
  AttemptHistoryEntry,
  Difficulty,
  Problem,
  Rating,
  ReviewLogFields,
  StudyMode,
  StudyPhase,
  StudyState,
  StudyStateSummary,
  TodayQueue,
  UserSettings,
} from "./types";

export type RecommendedReason = "Due now" | "Overdue" | "Review focus";

export interface RecommendedProblemView {
  slug: string;
  title: string;
  url: string;
  difficulty: Difficulty;
  reason: RecommendedReason;
  nextReviewAt?: string;
  daysOverdue?: number;
  alsoCourseNext?: boolean;
}

export type TrackQuestionStatusView =
  | "CURRENT"
  | "LOCKED"
  | "QUEUED"
  | "READY"
  | "DUE_NOW";

export interface TrackQuestionView {
  slug: string;
  title: string;
  url: string;
  difficulty: Difficulty;
  /** ID of the Track chapter (group) containing this question. */
  chapterId: string;
  chapterTitle: string;
  status: TrackQuestionStatusView;
  reviewPhase?: StudyPhase;
  nextReviewAt?: string;
  inLibrary: boolean;
  isCurrent: boolean;
}

export type TrackChapterStatusView = "COMPLETE" | "CURRENT" | "UPCOMING";

export interface TrackChapterView {
  id: string;
  title: string;
  order: number;
  status: TrackChapterStatusView;
  totalQuestions: number;
  completedQuestions: number;
  questions: TrackQuestionView[];
}

export interface TrackCardView {
  id: string;
  name: string;
  description: string;
  sourceSet: string;
  active: boolean;
  totalQuestions: number;
  completedQuestions: number;
  completionPercent: number;
  dueCount: number;
  totalChapters: number;
  completedChapters: number;
  nextQuestionTitle?: string;
  nextChapterTitle?: string;
}

export interface ActiveTrackView extends TrackCardView {
  activeChapterId: string | null;
  activeChapterTitle: string | null;
  nextQuestion: TrackQuestionView | null;
  chapters: TrackChapterView[];
}

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

export interface TrackMembership {
  trackId: import("./common/ids").StudySetId;
  trackName: string;
  groupId?: import("./common/ids").SetGroupId;
  groupName?: string;
}

// ---------- v7 hydrated views ----------
//
// View consumers (popup / dashboard / overlay) get the entity surface
// pre-hydrated: Topic and Company names are resolved server-side and
// `editedFields` is flattened from `Problem.userEdits` so components
// don't need access to the canonical registry maps.

export interface TopicLabel {
  id: string;
  name: string;
}

export interface CompanyLabel {
  id: string;
  name: string;
}

/**
 * UI-friendly view of a Problem. Identical to the entity except topic
 * and company FKs are pre-joined to display labels and `editedFields`
 * is a flat list (the underlying flag map is awkward to iterate).
 */
export interface ProblemView {
  slug: string;
  title: string;
  difficulty: import("./types").Difficulty;
  isPremium: boolean;
  url: string;
  leetcodeId?: string;
  topics: TopicLabel[];
  companies: CompanyLabel[];
  editedFields: import("./problems/model").EditableProblemField[];
}

/**
 * Consolidated UI-ready view of a StudyState. Composes the FSRS-derived
 * summary (phase, stability, retrievability, …) with the user-facing
 * log fields (notes, pattern, complexities) and a pre-sliced
 * recent-attempts list. Mirrors `ProblemView`'s role for Problem — the
 * single shape every UI surface needs from a StudyState. Built via
 * `buildStudyStateView` in `domain/views/hydrate.ts`.
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

/** Discriminated UI shape for a StudySet. Each case carries the data the
 * matching component renderer needs without forcing it to match across
 * variants. */
export type StudySetView =
  | {
      kind: "flat";
      id: string;
      name: string;
      description?: string;
      enabled: boolean;
      problems: ProblemView[];
    }
  | {
      kind: "grouped";
      id: string;
      name: string;
      description?: string;
      enabled: boolean;
      groups: Array<{
        id: string;
        name: string;
        prerequisiteGroupIds: string[];
        unlocked: boolean;
        problems: ProblemView[];
        /** v7 — count of slugs in this group that are marked completed in
         * the StudySetProgress aggregate. Used for `Topic · 5/10` tab labels. */
        completedCount: number;
        /** v7 — total number of slugs in the group (denominator). */
        totalCount: number;
      }>;
    }
  | {
      kind: "derived";
      id: string;
      name: string;
      description?: string;
      enabled: boolean;
      filterDescription: string;
      problems: ProblemView[];
    };


export interface PopupViewData {
  dueCount: number;
  streakDays: number;
  recommended: RecommendedProblemView | null;
  recommendedCandidates: RecommendedProblemView[];
  /** Next question on the user's active Track. */
  trackNext: TrackQuestionView | null;
  /** Compact card view of the active Track. */
  activeTrack: TrackCardView | null;
}

export interface PopupShellPayload {
  settings: UserSettings;
  popup: PopupViewData;
  /** Detailed view of the active Track for dashboard surfaces. */
  activeTrack: ActiveTrackView | null;
}

export interface AppShellPayload extends PopupShellPayload {
  queue: TodayQueue;
  analytics: AnalyticsSummary;
  recommendedCandidates: RecommendedProblemView[];
  library: LibraryProblemRow[];
  /** Every Track hydrated for the dashboard's Tracks tab. */
  tracks: StudySetView[];
  /** v7 — flat list of every Topic, sorted by name; for Autocomplete inputs. */
  topicChoices: TopicLabel[];
  /** v7 — flat list of every Company, sorted by name; for Autocomplete inputs. */
  companyChoices: CompanyLabel[];
}

export interface SaveReviewResultResponse {
  studyState: StudyState;
  nextReviewAt?: string;
  phase: StudyPhase;
  lastRating?: import("./types").Rating;
}

export interface ProblemContextResponse {
  problem: Problem | null;
  studyState: StudyState | null;
}

export interface ProblemMutationResponse {
  problem: Problem;
  studyState: StudyState;
}

export interface ImportSummaryResponse {
  setName: string;
  count: number;
  added: number;
  updated: number;
}

export interface SettingsUpdateResponse {
  settings: UserSettings;
}

export interface OpenedResponse {
  opened: true;
}

export interface ImportedResponse {
  imported: true;
}

export interface StudyStateMutationResponse {
  studyState: StudyState;
}

export interface StudyHistoryResetResponse {
  reset: true;
}

export interface PopupModeLabel {
  currentMode: StudyMode;
}
