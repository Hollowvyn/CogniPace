/** Repository for settings mutations. */
import { UserSettingsPatch } from "@features/settings/server";
import { sendMessage } from "@libs/runtime-rpc/client";


/** Persists a partial settings update through the background worker. */
export async function updateSettings(payload: UserSettingsPatch) {
  return sendMessage("UPDATE_SETTINGS", payload);
}

/** Clears all local study history while preserving settings, courses, and library data. */
export async function resetStudyHistory() {
  return sendMessage("RESET_STUDY_HISTORY", {});
}
