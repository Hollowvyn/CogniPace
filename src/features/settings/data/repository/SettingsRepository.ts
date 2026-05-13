import { sendMessage } from "@libs/runtime-rpc/client";

import {
  cloneUserSettings,
  createInitialUserSettings,
  sanitizeStoredUserSettings,
  type StudyMode,
  type UserSettings,
  type UserSettingsPatch,
} from "../../domain/model";

import type { TrackId } from "@shared/ids";


export interface SettingsRepository {
  /** The canonical settings update. Every typed helper on this
   *  interface delegates here; every settings field flows through one
   *  message type (`UPDATE_SETTINGS`), one handler, one validator.
   *
   *  Round-trip is persisted-then-readback (charter lesson #6) — the
   *  returned snapshot is the next read, not the caller's argument. */
  update(patch: UserSettingsPatch): Promise<UserSettings>;
  setSkipPremium(skipPremium: boolean): Promise<UserSettings>;
  setStudyMode(mode: StudyMode): Promise<UserSettings>;
  /** Set the user's currently-focused track. Pass `null` to clear. */
  setActiveTrack(trackId: TrackId | null): Promise<UserSettings>;
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
  setActiveTrack: (trackId) => dispatchUpdate({ activeTrackId: trackId }),
  saveDraft: (draft) =>
    dispatchUpdate(sanitizeStoredUserSettings(cloneUserSettings(draft))),
  resetToDefaults: () => dispatchUpdate(createInitialUserSettings()),
};
