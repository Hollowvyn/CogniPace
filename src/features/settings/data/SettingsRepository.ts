/**
 * Settings repository — SQLite source of truth for UserSettings.
 *
 * Stores the entire UserSettings object as a JSON-encoded string under
 * a single row of `settings_kv` keyed `user_settings`. The codec is
 * inline here per the data shape doc's recommendation #4 (extract a
 * separate codec file only if this grows past ~100 lines).
 *
 * Charter rule (lesson #6): the write path returns the round-tripped
 * value so the response always matches the next read. We achieve that
 * by reading back from the DB after every save instead of returning
 * the pre-write argument.
 */
import { type Db } from "@platform/db/client";
import * as schema from "@platform/db/schema";
import { eq } from "drizzle-orm";

import {
  createInitialUserSettings,
  sanitizeStoredUserSettings,
} from "../domain";

import type { UserSettings } from "../domain/UserSettings";

/** Storage key for the entire UserSettings JSON document. */
export const USER_SETTINGS_KEY = "user_settings";

/**
 * Reads UserSettings from SQLite. Returns `undefined` when the row is
 * missing (fresh-install path — the caller seeds defaults). Returns
 * sanitised UserSettings otherwise.
 */
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

/**
 * Persists UserSettings to SQLite (UPSERT on `key`). Returns the
 * round-tripped value — re-fetched from the DB — so the caller's
 * response shape matches the next read. The sanitiser is applied on
 * both the write argument (before encoding) and the read result.
 */
export async function saveUserSettings(
  db: Db,
  settings: UserSettings,
): Promise<UserSettings> {
  const sanitised = sanitizeStoredUserSettings(settings);
  const now = new Date().toISOString();
  await db
    .insert(schema.settingsKv)
    .values({
      key: USER_SETTINGS_KEY,
      value: JSON.stringify(sanitised),
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.settingsKv.key,
      set: {
        value: JSON.stringify(sanitised),
        updatedAt: now,
      },
    });
  const saved = await getUserSettings(db);
  if (!saved) {
    throw new Error(
      "saveUserSettings: insert succeeded but row vanished on readback",
    );
  }
  return saved;
}

/**
 * Idempotent boot seed. If `user_settings` is absent, writes the
 * factory defaults from `createInitialUserSettings()`. If present,
 * leaves the row untouched so a user's existing preferences survive
 * an SW wake.
 */
export async function seedInitialSettings(db: Db): Promise<UserSettings> {
  const existing = await getUserSettings(db);
  if (existing) return existing;
  return saveUserSettings(db, createInitialUserSettings());
}
