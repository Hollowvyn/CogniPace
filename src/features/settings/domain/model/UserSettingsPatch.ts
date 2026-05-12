import type { DifficultyGoalSettings } from "./DifficultyGoalSettings";
import type { ExperimentalSettings } from "./ExperimentalSettings";
import type { MemoryReviewSettings } from "./MemoryReviewSettings";
import type { NotificationSettings } from "./NotificationSettings";
import type { QuestionFilterSettings } from "./QuestionFilterSettings";
import type { TimingSettings } from "./TimingSettings";
import type { UserSettings } from "./UserSettings";

/**
 * The patch shape the SW's `UPDATE_SETTINGS` handler accepts. Top-level
 * scalars are optional; nested object settings are deep-partial so a
 * caller can flip one nested flag without rebuilding the whole object.
 */
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
