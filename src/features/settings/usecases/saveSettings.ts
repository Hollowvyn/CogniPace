import { sanitizeStoredUserSettings } from "../domain/sanitize";
import { cloneUserSettings } from "../domain/update";

import type { SettingsRepository } from "../data/SettingsRepository";
import type { UserSettings } from "../domain/UserSettings";

/**
 * Bulk usecase: persist a full UserSettings draft.
 *
 * The settings editor lets the user free-form edit many fields and
 * then commit them all at once. That bulk save needs a *usecase* of
 * its own — the curated single-field usecases (`setActiveTrack`,
 * `setDailyTarget`, `setStudyMode`) intentionally don't compose for
 * this case because the draft can touch nested objects (timing,
 * notifications, memoryReview, etc.) in one shot.
 *
 * Responsibilities owned here:
 *   - Sanitize the draft (drop unknown fields, coerce ranges) before
 *     it hits the repository — the SW trusts the contract.
 *   - Clone before sanitizing so the caller's draft isn't mutated.
 *
 * Returns the round-tripped settings as saved by the SW.
 */
export async function saveSettings(
  repo: SettingsRepository,
  draft: UserSettings,
): Promise<UserSettings> {
  const sanitized = sanitizeStoredUserSettings(cloneUserSettings(draft));
  return repo.update(sanitized);
}
