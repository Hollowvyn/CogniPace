import { type Db } from "@platform/db/client";
import * as schema from "@platform/db/schema";
import { nowIso } from "@platform/time";
import { eq } from "drizzle-orm";

import {
  createInitialUserSettings,
  sanitizeStoredUserSettings,
  type UserSettings,
} from "../../domain/model";

export const USER_SETTINGS_KEY = "user_settings";

export async function getUserSettings(
  db: Db,
): Promise<UserSettings | undefined> {
  const rows = await db
    .select()
    .from(schema.settingsKv)
    .where(eq(schema.settingsKv.key, USER_SETTINGS_KEY));
  if (rows.length === 0) return undefined;
  const parsed: unknown = JSON.parse(rows[0].value);
  return sanitizeStoredUserSettings(parsed);
}

export async function saveUserSettings(
  db: Db,
  settings: UserSettings,
): Promise<UserSettings> {
  const sanitised = sanitizeStoredUserSettings(settings);
  const now = nowIso();
  await db
    .insert(schema.settingsKv)
    .values({
      key: USER_SETTINGS_KEY,
      value: JSON.stringify(sanitised),
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.settingsKv.key,
      set: { value: JSON.stringify(sanitised), updatedAt: now },
    });
  // Round-trip via readback (charter lesson #6) so the response shape
  // always matches the next read, even if a future trigger/migration
  // mutates the row mid-write.
  const saved = await getUserSettings(db);
  if (!saved) {
    throw new Error(
      "saveUserSettings: insert succeeded but row vanished on readback",
    );
  }
  return saved;
}

export async function seedInitialSettings(db: Db): Promise<UserSettings> {
  const existing = await getUserSettings(db);
  if (existing) return existing;
  return saveUserSettings(db, createInitialUserSettings());
}
