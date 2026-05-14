import type { DifficultyGoalSettings } from "./DifficultyGoalSettings";
import type { ExperimentalSettings } from "./ExperimentalSettings";
import type { MemoryReviewSettings } from "./MemoryReviewSettings";
import type { NotificationSettings } from "./NotificationSettings";
import type { QuestionFilterSettings } from "./QuestionFilterSettings";
import type { TimingSettings } from "./TimingSettings";
import type { UserSettings } from "./UserSettings";

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
