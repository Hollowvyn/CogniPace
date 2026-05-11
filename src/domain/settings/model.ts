import type { ActiveFocus } from "../active-focus/model";

export type ReviewOrder = "dueFirst" | "mixByDifficulty" | "weakestFirst";

export type StudyMode = "freestyle" | "studyPlan";

export interface DifficultyGoalSettings {
  Easy: number;
  Medium: number;
  Hard: number;
}

export interface NotificationSettings {
  enabled: boolean;
  dailyTime: string;
}

export interface MemoryReviewSettings {
  targetRetention: number;
  reviewOrder: ReviewOrder;
}

export interface QuestionFilterSettings {
  /** When on, premium-locked problems are treated as suspended — they
   * don't appear in the queue and surface with a Suspended badge in
   * the library/tracks tables. */
  skipPremium: boolean;
}

export interface TimingSettings {
  requireSolveTime: boolean;
  hardMode: boolean;
  difficultyGoalMs: DifficultyGoalSettings;
}

export interface ExperimentalSettings {
  autoDetectSolved: boolean;
}

/**
 * Interview-target overlay. When present, scheduling shifts toward
 * peak-by-date readiness for the named company: today's effective daily
 * goal is bumped to ceil(uncoveredPoolSize / daysRemaining) so the user
 * covers the company's pool by interview day. FSRS continues to order
 * within each day's slot.
 */
export interface InterviewTarget {
  /** Company slug from `companiesById`. Tied to the active company pool
   * — when this doesn't match `activeFocus`, the overlay stays inert. */
  companyId: string;
  /** Interview date as ISO 8601 (`YYYY-MM-DD` or full timestamp). */
  date: string;
  /** Number of interview rounds. Currently informational; reserved for
   * future scheduling refinements. */
  interviewCount: number;
}

export interface UserSettings {
  dailyQuestionGoal: number;
  studyMode: StudyMode;
  /** v6 — replaced by `StudySet.enabled` in v7. */
  setsEnabled: Record<string, boolean>;
  /** Discriminated current selection across all Tracks. The single source
   * of truth for "which Track is the user focused on right now". */
  activeFocus: ActiveFocus;
  /** Optional peak-by-date overlay. Null/absent when the user has no
   * upcoming interview to ramp for. */
  interviewTarget: InterviewTarget | null;
  notifications: NotificationSettings;
  memoryReview: MemoryReviewSettings;
  questionFilters: QuestionFilterSettings;
  timing: TimingSettings;
  experimental: ExperimentalSettings;
}

export type UserSettingsPatch = Partial<
  Omit<
    UserSettings,
    "experimental" | "memoryReview" | "notifications" | "questionFilters" | "timing"
  >
> & {
  experimental?: Partial<ExperimentalSettings>;
  memoryReview?: Partial<MemoryReviewSettings>;
  notifications?: Partial<NotificationSettings>;
  questionFilters?: Partial<QuestionFilterSettings>;
  timing?: Partial<Omit<TimingSettings, "difficultyGoalMs">> & {
    difficultyGoalMs?: Partial<DifficultyGoalSettings>;
  };
  /** Pass `null` to clear the overlay. Pass a fresh `InterviewTarget`
   * object to replace the current one (partial-merge is not supported —
   * date/count must be coherent). */
  interviewTarget?: InterviewTarget | null;
};
