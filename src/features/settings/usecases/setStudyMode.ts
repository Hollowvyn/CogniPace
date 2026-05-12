import type { SettingsRepository } from "../data/SettingsRepository";
import type { StudyMode } from "../domain/UserSettings";

/**
 * Curated usecase: toggle between the two study modes. Both popup and
 * dashboard surfaces hit this — keeping the patch shape here removes
 * the temptation for either surface to rebuild a full UserSettings
 * payload to flip one flag.
 */
export async function setStudyMode(
  repo: SettingsRepository,
  mode: StudyMode,
): Promise<void> {
  await repo.update({ studyMode: mode });
}
