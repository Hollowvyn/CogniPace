import { UserSettings } from "../../../../../domain/settings";

export type SettingsUpdate = (
  updater: (current: UserSettings) => UserSettings
) => void;
