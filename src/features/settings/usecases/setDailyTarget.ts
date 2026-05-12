import type { SettingsClient } from "../messaging/client";

/**
 * Curated usecase: set the daily-question goal. Throws on non-positive
 * inputs so callers can rely on a finite, positive integer being
 * persisted — validation lives one place rather than at every UI
 * call site.
 */
export async function setDailyTarget(
  client: SettingsClient,
  count: number,
): Promise<void> {
  if (!Number.isFinite(count) || count < 1) {
    throw new Error(
      `setDailyTarget: count must be a positive integer (got ${String(count)})`,
    );
  }
  await client.update({ dailyQuestionGoal: Math.floor(count) });
}
