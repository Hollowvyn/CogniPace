import { createInitialUserSettings } from "../domain/seed";

import type { UserSettings } from "../domain/UserSettings";
import type { SettingsClient } from "../messaging/client";

/**
 * Bulk usecase: replace the persisted settings with the default
 * snapshot. Owns where the "defaults" come from (the seed file) so
 * the View can't accidentally ship a half-correct factory reset.
 *
 * Returns the round-tripped settings as saved by the SW.
 */
export async function resetSettings(
  client: SettingsClient,
): Promise<UserSettings> {
  return client.update(createInitialUserSettings());
}
