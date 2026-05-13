import { sendMessage } from "@libs/runtime-rpc/client";

import {
  cloneUserSettings,
  createInitialUserSettings,
  sanitizeStoredUserSettings,
  type StudyMode,
  type UserSettings,
  type UserSettingsPatch,
} from "../../domain/model";

export interface SettingsRepository {
  /** Round-trip is persisted-then-readback (charter lesson #6) — the
   *  returned snapshot is the next read, not the caller's argument. */
  update(patch: UserSettingsPatch): Promise<UserSettings>;
  setSkipPremium(skipPremium: boolean): Promise<UserSettings>;
  setStudyMode(mode: StudyMode): Promise<UserSettings>;
  saveDraft(draft: UserSettings): Promise<UserSettings>;
  resetToDefaults(): Promise<UserSettings>;
}

async function dispatchUpdate(patch: UserSettingsPatch): Promise<UserSettings> {
  const response = await sendMessage("UPDATE_SETTINGS", patch);
  if (!response.ok || !response.data) {
    throw new Error(
      response.error ?? "settingsRepository.update: SW returned no data",
    );
  }
  return response.data.settings;
}

export const settingsRepository: SettingsRepository = {
  update: dispatchUpdate,
  setSkipPremium: (skipPremium) =>
    dispatchUpdate({ questionFilters: { skipPremium } }),
  setStudyMode: (mode) => dispatchUpdate({ studyMode: mode }),
  saveDraft: (draft) =>
    dispatchUpdate(sanitizeStoredUserSettings(cloneUserSettings(draft))),
  resetToDefaults: () => dispatchUpdate(createInitialUserSettings()),
};
