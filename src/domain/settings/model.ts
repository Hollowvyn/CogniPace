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
  skipIgnored: boolean;
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

export interface UserSettings {
  dailyQuestionGoal: number;
  studyMode: StudyMode;
  /** v6 — replaced by `activeFocus` in v7. Kept for backwards compatibility
   * during the migration; consumers prefer `activeFocus` when present. */
  activeCourseId: string;
  /** v6 — replaced by `StudySet.enabled` in v7. */
  setsEnabled: Record<string, boolean>;
  /** v7 — discriminated current selection across all StudySets. */
  activeFocus?: ActiveFocus;
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
};
