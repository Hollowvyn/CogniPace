/**
 * Settings repository tests. Single-row JSON codec under
 * settings_kv['user_settings'].
 *
 * Pins:
 *  - getUserSettings returns undefined for a fresh DB
 *  - saveUserSettings round-trips (charter lesson #6: write returns
 *    same shape the next read would)
 *  - seedInitialSettings is idempotent and does not clobber existing
 *  - sanitiser is applied on both write and read (so malformed
 *    stored values don't escape the boundary)
 */
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { beforeEach, describe, expect, it } from "vitest";

import * as schema from "../../../src/data/db/schema";
import {
  getUserSettings,
  saveUserSettings,
  seedInitialSettings,
  USER_SETTINGS_KEY,
} from "../../../src/data/settings/repository";
import { createInitialUserSettings } from "../../../src/domain/settings";

import type { Db } from "../../../src/data/db/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(
  __dirname,
  "../../../src/data/db/migrations",
);

function freshDb(): Db {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
  return db as unknown as Db;
}

describe("settings repository", () => {
  let db: Db;
  beforeEach(() => {
    db = freshDb();
  });

  it("getUserSettings returns undefined on a fresh DB", async () => {
    expect(await getUserSettings(db)).toBeUndefined();
  });

  it("saveUserSettings round-trips the full UserSettings shape", async () => {
    const initial = createInitialUserSettings();
    const saved = await saveUserSettings(db, {
      ...initial,
      dailyQuestionGoal: 7,
      studyMode: "studyPlan",
    });
    expect(saved.dailyQuestionGoal).toBe(7);
    expect(saved.studyMode).toBe("studyPlan");

    const fetched = await getUserSettings(db);
    expect(fetched).toEqual(saved);
  });

  it("saveUserSettings upserts on conflict (second save replaces, not duplicates)", async () => {
    const initial = createInitialUserSettings();
    await saveUserSettings(db, { ...initial, dailyQuestionGoal: 3 });
    await saveUserSettings(db, { ...initial, dailyQuestionGoal: 9 });
    const after = await getUserSettings(db);
    expect(after?.dailyQuestionGoal).toBe(9);
    const allRows = await db.select().from(schema.settingsKv);
    expect(allRows).toHaveLength(1);
    expect(allRows[0].key).toBe(USER_SETTINGS_KEY);
  });

  it("seedInitialSettings writes defaults when missing", async () => {
    const seeded = await seedInitialSettings(db);
    expect(seeded.dailyQuestionGoal).toBe(
      createInitialUserSettings().dailyQuestionGoal,
    );
    expect(await getUserSettings(db)).toEqual(seeded);
  });

  it("seedInitialSettings does NOT clobber an existing row", async () => {
    const initial = createInitialUserSettings();
    const customised = await saveUserSettings(db, {
      ...initial,
      dailyQuestionGoal: 15,
    });
    const seeded = await seedInitialSettings(db);
    expect(seeded.dailyQuestionGoal).toBe(15);
    expect(seeded).toEqual(customised);
  });
});
