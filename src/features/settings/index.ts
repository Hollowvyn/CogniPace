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
 *   - Repository interface + default class + production singleton.
 *   - Messaging client (escape hatch for tests / advanced wiring).
 *   - ViewModel hook + Screen.
 *
 * No `usecases` re-export — every settings action is a method on the
 * Repository. A `domain/usecases/` folder is reserved for features
 * whose actions need to compose across multiple repositories.
 */

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
} from "./domain/model";

// Repository — the abstraction the screen calls. Methods cover every
// settings action (update + curated + bulk).
export type { SettingsRepository } from "./data/repository/SettingsRepository";
export {
  DefaultSettingsRepository,
  settingsRepository,
} from "./data/repository/SettingsRepository";

// Messaging client — exposed for tests + advanced composition. New
// code should call the Repository, not the Client.
export type { SettingsClient } from "./messaging/client";
export { settingsClient } from "./messaging/client";

// ViewModel hook (MVI). The View calls this; the hook gets the
// Repository from `useDI()` so tests can inject a fake.
export {
  useSettingsScreen,
  type SettingsIntentResult,
  type SettingsScreenModel,
  type UseSettingsScreenArgs,
} from "./ui/hooks/useSettingsScreen";

// Screen — wired into the dashboard rail by the composition root.
export { SettingsView as SettingsScreen } from "./ui/screens/SettingsView";
