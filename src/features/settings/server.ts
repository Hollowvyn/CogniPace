/**
 * SW-side public barrel for the settings feature. `app/entrypoints/
 * background.ts` (Phase 8) and the current central router import only
 * from here for settings concerns. Re-exports the message handlers,
 * the SW-side data source, and the domain merge / sanitize helpers —
 * nothing React-bearing.
 *
 * Naming (Android-style; see plan §"MVI invariant"):
 *   - `SettingsDataSource` is the SW-side Drizzle I/O.
 *   - The UI-side `SettingsRepository` (in `./data/SettingsRepository`,
 *     exposed via `index.ts`) sits between the UI's Usecase and the
 *     `MessagingClient` that crosses the SW boundary.
 *
 * Keeping `index.ts` (UI) and `server.ts` (SW) separate enforces the
 * Service-Worker bundle hygiene rule from the plan (no React, no MUI
 * in the SW bundle).
 */
export type {
  UserSettings,
  UserSettingsPatch,
} from "./domain/model/UserSettings";

// Handlers — central router (and Phase 8's app/background/router.ts)
// dispatch to these.
export { updateSettings } from "./messaging/handlers";

// Data source + seed helper — SW boot uses these directly.
export {
  getUserSettings,
  saveUserSettings,
  seedInitialSettings,
  USER_SETTINGS_KEY,
} from "./data/SettingsDataSource";

// Pure model helpers needed by SW-side handlers (merge incoming patch,
// sanitize a stored snapshot, seed a default).
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
