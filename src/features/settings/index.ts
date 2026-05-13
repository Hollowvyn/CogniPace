/** UI-side barrel for the settings feature. Cross-feature consumers
 *  import from here only (deep paths stay internal). */

// DomainModel types.
export type {
  DifficultyGoalSettings,
  ExperimentalSettings,
  MemoryReviewSettings,
  NotificationSettings,
  QuestionFilterSettings,
  ReviewOrder,
  StudyMode,
  TimingSettings,
  UserSettings,
  UserSettingsPatch,
} from "./domain/model";

// Pure model helpers — safe for UI consumers (fixtures, mocks,
// equality checks). Writes go through the Repository.
export {
  INITIAL_USER_SETTINGS,
  areUserSettingsEqual,
  cloneUserSettings,
  createInitialSetsEnabled,
  createInitialUserSettings,
  mergeUserSettings,
  sanitizeStoredUserSettings,
} from "./domain/model";

// Repository — the abstraction the screen calls.
export type { SettingsRepository } from "./data/repository/SettingsRepository";
export {
  DefaultSettingsRepository,
  settingsRepository,
} from "./data/repository/SettingsRepository";

// ViewModel hook + Screen.
export {
  useSettingsScreen,
  type SettingsIntentResult,
  type SettingsScreenModel,
  type UseSettingsScreenArgs,
} from "./ui/hooks/useSettingsScreen";
export { SettingsView as SettingsScreen } from "./ui/screens/SettingsView";
