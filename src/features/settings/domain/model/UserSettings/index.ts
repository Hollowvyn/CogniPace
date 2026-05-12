/**
 * UserSettings — aggregate DomainModel for user-tunable settings.
 *
 * Folder layout (one model per file + its specific helpers):
 *
 *   - Types: UserSettings.ts (aggregate), UserSettingsPatch.ts, plus
 *     one file per nested type (StudyMode, ReviewOrder, TimingSettings,
 *     NotificationSettings, MemoryReviewSettings,
 *     QuestionFilterSettings, ExperimentalSettings,
 *     DifficultyGoalSettings).
 *   - Defaults: default.ts          — INITIAL_USER_SETTINGS +
 *                                     createInitialUserSettings.
 *   - Pure helpers (specific to this model):
 *       equality.ts                 — areUserSettingsEqual.
 *       sanitize.ts                 — sanitizeStoredUserSettings +
 *                                     predicates.
 *       clone.ts                    — cloneUserSettings.
 *       merge.ts                    — mergeUserSettings.
 *
 * Domain-wide helpers (not specific to any one model) live in
 * `features/settings/domain/utils/` instead.
 */
export type { UserSettings } from "./UserSettings";
export type { UserSettingsPatch } from "./UserSettingsPatch";
export type { StudyMode } from "./StudyMode";
export type { ReviewOrder } from "./ReviewOrder";
export type { DifficultyGoalSettings } from "./DifficultyGoalSettings";
export type { NotificationSettings } from "./NotificationSettings";
export type { MemoryReviewSettings } from "./MemoryReviewSettings";
export type { QuestionFilterSettings } from "./QuestionFilterSettings";
export type { TimingSettings } from "./TimingSettings";
export type { ExperimentalSettings } from "./ExperimentalSettings";

export {
  INITIAL_USER_SETTINGS,
  createInitialUserSettings,
  createInitialSetsEnabled,
} from "./default";
export { areUserSettingsEqual } from "./equality";
export {
  hasGroupedUserSettings,
  isPersistedUserSettings,
  sanitizeStoredUserSettings,
} from "./sanitize";
export { cloneUserSettings } from "./clone";
export { mergeUserSettings } from "./merge";
