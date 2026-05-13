import { getDb } from "@platform/db/instance";

import { mergeSettings } from "../../../data/repositories/appDataRepository";
import { ok } from "../../../extension/background/responses";
import { getUserSettings, saveUserSettings } from "../data/datasource/SettingsDataSource";
import { createInitialUserSettings } from "../domain";

export async function updateSettings(payload: Record<string, unknown>) {
  const { db } = await getDb();
  const current = (await getUserSettings(db)) ?? createInitialUserSettings();
  const merged = mergeSettings(current, payload);
  const saved = await saveUserSettings(db, merged);
  return ok({ settings: saved });
}
