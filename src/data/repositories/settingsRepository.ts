/** Repository for settings mutations. */
import { UserSettings } from "../../domain/types";
import { sendMessage } from "../../extension/runtime/client";

/** Persists a partial settings update through the background worker. */
export async function updateSettings(
  payload: Partial<UserSettings> & { activeStudyPlanId?: string }
) {
  return sendMessage("UPDATE_SETTINGS", payload);
}
