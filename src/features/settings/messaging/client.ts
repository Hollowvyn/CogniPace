import { sendMessage } from "@libs/runtime-rpc/client";

import type { UserSettings, UserSettingsPatch } from "../domain/model";

export interface SettingsClient {
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
