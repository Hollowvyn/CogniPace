import { getDb } from "@platform/db/instance";


import { getUserSettings, saveUserSettings } from "../data/datasource/SettingsDataSource";
import {
  createInitialUserSettings,
  mergeUserSettings,
  type UserSettingsPatch,
} from "../domain/model";

export async function getSettings() {
  const { db } = await getDb();
  return (await getUserSettings(db)) ?? createInitialUserSettings();
}

export async function updateSettings(
  payload: Record<string, unknown>,
): Promise<{ settings: unknown }> {
  const { db } = await getDb();
  const current = (await getUserSettings(db)) ?? createInitialUserSettings();
  const merged = mergeUserSettings(current, payload as UserSettingsPatch);
  const saved = await saveUserSettings(db, merged);
  return { settings: saved };
}
