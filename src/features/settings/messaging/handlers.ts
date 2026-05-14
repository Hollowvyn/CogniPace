import { ResultAsync , toErrMsg } from "@libs/result";
import { getDb } from "@platform/db/instance";

import { getUserSettings, saveUserSettings } from "../data/datasource/SettingsDataSource";
import {
  createInitialUserSettings,
  mergeUserSettings,
  type UserSettingsPatch,
} from "../domain/model";

export function updateSettings(
  payload: Record<string, unknown>,
): ResultAsync<{ settings: unknown }, string> {
  return ResultAsync.fromPromise(
    (async () => {
      const { db } = await getDb();
      const current = (await getUserSettings(db)) ?? createInitialUserSettings();
      const merged = mergeUserSettings(current, payload as UserSettingsPatch);
      const saved = await saveUserSettings(db, merged);
      return { settings: saved };
    })(),
    toErrMsg,
  );
}
