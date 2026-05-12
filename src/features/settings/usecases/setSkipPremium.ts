import type { SettingsRepository } from "../data/SettingsRepository";
import type { UserSettings } from "../domain/UserSettings";

/**
 * Curated usecase: toggle the "skip premium-locked problems" filter.
 *
 * Pass `true` to suspend premium-locked problems (they stop appearing
 * in the queue and surface with a Suspended badge); pass `false` to
 * surface them. Owns the patch shape so callers (the dashboard's
 * "Enable premium" banner, the library filter chip, etc.) don't
 * assemble a UserSettings.
 */
export async function setSkipPremium(
  repo: SettingsRepository,
  skipPremium: boolean,
): Promise<UserSettings> {
  return repo.update({ questionFilters: { skipPremium } });
}
