import { api } from "@app/api";

import {
  cloneUserSettings,
  createInitialUserSettings,
  sanitizeStoredUserSettings,
  type StudyMode,
  type UserSettings,
  type UserSettingsPatch,
} from "../../domain/model";

export interface SettingsRepository {
  getSettings(): Promise<UserSettings>;
  /** The canonical settings update. Every typed helper on this
   *  interface delegates here; every settings field flows through one
   *  message type (`updateSettings`), one handler.
   *
   *  Round-trip is persisted-then-readback (charter lesson #6) — the
   *  returned snapshot is the next read, not the caller's argument. */
  update(patch: UserSettingsPatch): Promise<UserSettings>;
  setSkipPremium(skipPremium: boolean): Promise<UserSettings>;
  setStudyMode(mode: StudyMode): Promise<UserSettings>;
  saveDraft(draft: UserSettings): Promise<UserSettings>;
  resetToDefaults(): Promise<UserSettings>;
}

async function dispatchUpdate(patch: UserSettingsPatch): Promise<UserSettings> {
  const result = await api.updateSettings(patch);
  return result.settings as UserSettings;
}

export const settingsRepository: SettingsRepository = {
  getSettings: () => api.getSettings({}),
  update: dispatchUpdate,
  setSkipPremium: (skipPremium) =>
    dispatchUpdate({ questionFilters: { skipPremium } }),
  setStudyMode: (mode) => dispatchUpdate({ studyMode: mode }),
  saveDraft: (draft) =>
    dispatchUpdate(sanitizeStoredUserSettings(cloneUserSettings(draft))),
  resetToDefaults: () => dispatchUpdate(createInitialUserSettings()),
};
