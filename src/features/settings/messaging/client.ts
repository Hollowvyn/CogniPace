/**
 * UI-side typed client for the settings feature. Wraps the runtime-rpc
 * `sendMessage` with feature-scoped method names so callers say
 * `settingsClient.update(patch)` instead of stringly-typed
 * `sendMessage("UPDATE_SETTINGS", ...)`.
 *
 * Curated usecases (`setActiveTrack`, `setDailyTarget`, `setStudyMode`)
 * sit on top of this client and compose the patch shape so feature
 * UI never assembles a UserSettings payload at the call site.
 */
import { sendMessage } from "@libs/runtime-rpc/client";

import type { UserSettings, UserSettingsPatch } from "../domain/UserSettings";

export interface SettingsClient {
  /** Apply a (possibly partial) settings patch. Returns the round-tripped
   * settings as saved (charter lesson #6). */
  update(patch: UserSettingsPatch): Promise<UserSettings>;
}

export const settingsClient: SettingsClient = {
  async update(patch) {
    const response = await sendMessage("UPDATE_SETTINGS", patch);
    if (!response.ok || !response.data) {
      throw new Error(
        response.error ?? "settingsClient.update: SW returned no data",
      );
    }
    return response.data.settings;
  },
};
