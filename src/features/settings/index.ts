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

// Messaging surface (typed client for UI callers).
export type { SettingsClient } from "./messaging/client";
export { settingsClient } from "./messaging/client";

// Curated usecases — UI calls these; they own the patch shapes.
export { setActiveTrack } from "./usecases/setActiveTrack";
export { setDailyTarget } from "./usecases/setDailyTarget";
export { setStudyMode } from "./usecases/setStudyMode";

// Screen — wired into the dashboard rail by the composition root.
export { SettingsView as SettingsScreen } from "./ui/screens/SettingsView";
