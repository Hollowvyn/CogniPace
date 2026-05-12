import { UserSettings } from "@features/settings";

export type SettingsUpdate = (
  updater: (current: UserSettings) => UserSettings
) => void;
