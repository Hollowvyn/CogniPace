import type { SettingsRepository } from "../data/SettingsRepository";
import type { StudyMode, UserSettings } from "../domain/UserSettings";

/**
 * Curated usecase: toggle between the two study modes. Both popup and
 * dashboard surfaces hit this — keeping the patch shape here removes
 * the temptation for either surface to rebuild a full UserSettings
 * payload to flip one flag.
 *
 * Returns the round-tripped settings as saved by the SW so callers
 * can patch their local payload state without re-fetching.
 */
export async function setStudyMode(
  repo: SettingsRepository,
  mode: StudyMode,
): Promise<UserSettings> {
  return repo.update({ studyMode: mode });
}
