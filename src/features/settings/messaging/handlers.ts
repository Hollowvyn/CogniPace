/** SW-side handlers for the settings feature. The central router
 *  dispatches to each named export. */
import { getDb } from "@platform/db/instance";

import { mergeSettings } from "../../../data/repositories/appDataRepository";
import { ok } from "../../../extension/background/responses";
import { getUserSettings, saveUserSettings } from "../data/datasource/SettingsDataSource";
import { createInitialUserSettings } from "../domain";

/** Applies a settings patch and returns the normalized saved settings.
 * Settings live in SQLite (Phase 5); the merge runs against the SQLite
 * copy and the write path returns the round-tripped value (charter
 * lesson #6) so the UI's next read matches. */
export async function updateSettings(payload: Record<string, unknown>) {
  const { db } = await getDb();
  const current = (await getUserSettings(db)) ?? createInitialUserSettings();
  const merged = mergeSettings(current, payload);
  const saved = await saveUserSettings(db, merged);
  return ok({ settings: saved });
}
