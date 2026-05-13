import { getDb } from "@platform/db/instance";

import { ok } from "../../../extension/background/responses";
import { getUserSettings, saveUserSettings } from "../data/datasource/SettingsDataSource";
import {
  createInitialUserSettings,
  mergeUserSettings,
  type UserSettingsPatch,
} from "../domain/model";

export async function updateSettings(payload: Record<string, unknown>) {
  const { db } = await getDb();
  const current = (await getUserSettings(db)) ?? createInitialUserSettings();
  const merged = mergeUserSettings(current, payload as UserSettingsPatch);
  const saved = await saveUserSettings(db, merged);
  return ok({ settings: saved });
}
