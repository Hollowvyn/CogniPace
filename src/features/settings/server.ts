/**
 * SW-side public barrel for the settings feature. `app/entrypoints/
 * background.ts` (Phase 8) and the current central router import only
 * from here for settings concerns. Re-exports the message handlers,
 * the repository, and the domain merge / sanitize helpers — nothing
 * React-bearing.
 *
 * Keeping `index.ts` (UI) and `server.ts` (SW) separate enforces the
 * Service-Worker bundle hygiene rule from the plan (no React, no MUI
 * in the SW bundle).
 */
export type {
  UserSettings,
  UserSettingsPatch,
} from "./domain/UserSettings";

// Handlers — central router (and Phase 8's app/background/router.ts)
// dispatch to these.
export { updateSettings } from "./messaging/handlers";

// Repository impl + seed helper — SW boot uses these directly.
export {
  getUserSettings,
  saveUserSettings,
  seedInitialSettings,
  USER_SETTINGS_KEY,
} from "./data/SettingsRepository";

// Pure domain helpers needed by SW-side handlers (merge incoming patch,
// sanitize a stored snapshot, seed a default).
export { cloneUserSettings, mergeUserSettings } from "./domain/update";
export { areUserSettingsEqual } from "./domain/equality";
export {
  createInitialUserSettings,
  createInitialSetsEnabled,
  INITIAL_USER_SETTINGS,
} from "./domain/seed";
export {
  hasGroupedUserSettings,
  isPersistedUserSettings,
  sanitizeStoredUserSettings,
} from "./domain/sanitize";
