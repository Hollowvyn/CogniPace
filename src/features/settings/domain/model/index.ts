/**
 * Barrel for the settings feature's DomainModels.
 *
 * Layout convention: one DomainModel per file. Functions that
 * operate *only* on a given model live inside that model's file
 * (the type is the file). Cross-model helpers go in `domain/utils/`.
 *
 * Phase 7 features replicate this same flat layout under
 * `<feature>/domain/model/`.
 */
export type { UserSettings } from "./UserSettings";
export {
  INITIAL_USER_SETTINGS,
  areUserSettingsEqual,
  cloneUserSettings,
  createInitialSetsEnabled,
  createInitialUserSettings,
  hasGroupedUserSettings,
  isPersistedUserSettings,
  mergeUserSettings,
  sanitizeStoredUserSettings,
} from "./UserSettings";

export type { UserSettingsPatch } from "./UserSettingsPatch";
export type { StudyMode } from "./StudyMode";
export type { ReviewOrder } from "./ReviewOrder";
export type { DifficultyGoalSettings } from "./DifficultyGoalSettings";
export type { NotificationSettings } from "./NotificationSettings";
export type { MemoryReviewSettings } from "./MemoryReviewSettings";
export type { QuestionFilterSettings } from "./QuestionFilterSettings";
export type { TimingSettings } from "./TimingSettings";
export type { ExperimentalSettings } from "./ExperimentalSettings";
