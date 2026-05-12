import type { StudyMode } from "../domain/UserSettings";
import type { SettingsClient } from "../messaging/client";

/**
 * Curated usecase: toggle between the two study modes. Both popup and
 * dashboard surfaces hit this — keeping the patch shape here removes
 * the temptation for either surface to rebuild a full UserSettings
 * payload to flip one flag.
 */
export async function setStudyMode(
  client: SettingsClient,
  mode: StudyMode,
): Promise<void> {
  await client.update({ studyMode: mode });
}
