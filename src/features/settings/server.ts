/** SW-side barrel for the settings feature. Imported only by the
 *  background entrypoint — no React. */
export type { UserSettings, UserSettingsPatch } from "./domain/model";

export { updateSettings } from "./messaging/handlers";

export {
  getUserSettings,
  saveUserSettings,
  seedInitialSettings,
  USER_SETTINGS_KEY,
} from "./data/datasource/SettingsDataSource";

// Model helpers SW-side callers need (handler, appDataRepository,
// notifications). Only adding when an importer materializes.
export {
  INITIAL_USER_SETTINGS,
  areUserSettingsEqual,
  createInitialUserSettings,
  mergeUserSettings,
  sanitizeStoredUserSettings,
} from "./domain/model";
