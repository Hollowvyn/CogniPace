/**
 * UI-side public barrel for the settings feature. Any surface that
 * needs to display or mutate settings imports from here (and only
 * here). The SW-side equivalent lives in `./server.ts`; keeping them
 * separate guarantees the popup / dashboard / overlay bundles never
 * pull SW-only code (drizzle, repository impls) and the background
 * bundle never pulls React.
 *
 * Phase 6 surface: domain types, pure helpers safe for UI consumers,
 * the typed messaging client, curated usecases, and the settings
 * screen (wired into the dashboard rail by the composition root).
 */

// Domain types (UserSettings + every nested setting interface).
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
} from "./domain/UserSettings";

// Pure domain helpers — safe for UI consumers (fixtures / mocks /
// equality checks). Writes still go through `settingsClient`.
export {
  INITIAL_USER_SETTINGS,
  createInitialUserSettings,
  createInitialSetsEnabled,
} from "./domain/seed";
export { areUserSettingsEqual } from "./domain/equality";
export {
  hasGroupedUserSettings,
  isPersistedUserSettings,
  sanitizeStoredUserSettings,
} from "./domain/sanitize";
export { cloneUserSettings, mergeUserSettings } from "./domain/update";

// Repository — the abstraction usecases code against. Hides the
// transport (the messaging client today; a cache + client tomorrow).
// Cross-feature callers reach for this; the messaging client itself
// stays internal to the feature.
export type { SettingsRepository } from "./data/SettingsRepository";
export {
  settingsRepository,
  createSettingsRepository,
} from "./data/SettingsRepository";

// Messaging client — exposed for tests + advanced composition; new
// code should call the Repository, not the Client.
export type { SettingsClient } from "./messaging/client";
export { settingsClient } from "./messaging/client";

// Usecases — Hook → usecase → client → SW → repo. UI surfaces outside
// the settings editor call the curated single-field usecases directly
// via the messaging client; the editor's bulk save/reset flow through
// `useSettingsScreen` which composes saveSettings / resetSettings.
export { setActiveTrack } from "./usecases/setActiveTrack";
export { setDailyTarget } from "./usecases/setDailyTarget";
export { setStudyMode } from "./usecases/setStudyMode";
export { saveSettings } from "./usecases/saveSettings";
export { resetSettings } from "./usecases/resetSettings";

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
