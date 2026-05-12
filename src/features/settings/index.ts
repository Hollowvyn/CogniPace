/**
 * UI-side public barrel for the settings feature. Any surface that
 * needs to display or mutate settings imports from here (and only
 * here). The SW-side equivalent lives in `./server.ts`; keeping them
 * separate guarantees the popup / dashboard / overlay bundles never
 * pull SW-only code (Drizzle, DataSource impls) and the background
 * bundle never pulls React.
 *
 * Surface:
 *   - DomainModel types (UserSettings aggregate + every nested type).
 *   - Pure model helpers (defaults, equality, sanitize, clone, merge).
 *   - Repository (the abstraction usecases code against).
 *   - Messaging client (escape hatch for tests / advanced wiring).
 *   - Usecases (curated single-field + bulk save/reset).
 *   - ViewModel hook + Screen.
 */

// DomainModel types — pulled in through the UserSettings model folder.
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
} from "./domain/model/UserSettings";

// Pure model helpers — safe for UI consumers (fixtures / mocks /
// equality checks). Writes go through the Repository.
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
} from "./domain/model/UserSettings";

// Repository — the abstraction usecases code against. Hides the
// transport (the messaging client today; a cache + client tomorrow).
export type { SettingsRepository } from "./data/SettingsRepository";
export {
  settingsRepository,
  createSettingsRepository,
} from "./data/SettingsRepository";

// Messaging client — exposed for tests + advanced composition. New
// code should call the Repository, not the Client.
export type { SettingsClient } from "./messaging/client";
export { settingsClient } from "./messaging/client";

// Usecases — Hook → Usecase → Repository → Client → SW → DataSource.
export {
  resetSettings,
  saveSettings,
  setActiveTrack,
  setDailyTarget,
  setSkipPremium,
  setStudyMode,
} from "./domain/usecases";

// ViewModel hook (MVI). The View calls this; no parent passes the
// draft / save / discard / reset wiring as props.
export {
  useSettingsScreen,
  type SettingsIntentResult,
  type SettingsScreenModel,
  type UseSettingsScreenArgs,
} from "./ui/hooks/useSettingsScreen";

// Screen — wired into the dashboard rail by the composition root.
export { SettingsView as SettingsScreen } from "./ui/screens/SettingsView";
