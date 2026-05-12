/**
 * Builds a fresh v7 AppData snapshot. Used both at first launch (no
 * stored data) and during the v6→v7 migration (after the v6 sidecar
 * backup has been written).
 *
 * Post-Phase-5: topics, companies, problems, study states, settings,
 * and tracks are all SSoT in SQLite. The fields kept here are
 * intentionally `{}` — the SW boot seeds SQLite, the dashboard handler
 * hydrates them at read time. They stay on the type only because the
 * legacy `AppData` shape still nominally carries them during the
 * transitional period.
 */
import { createInitialUserSettings } from "@features/settings/server";

import { STORAGE_SCHEMA_VERSION_V7 } from "../../../domain/data/appDataV7";

import type { AppDataV7 } from "../../../domain/data/appDataV7";

export function buildFreshAppDataV7(now: string): AppDataV7 {
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION_V7,
    problemsBySlug: {},
    studyStatesBySlug: {},
    topicsById: {},
    companiesById: {},
    settings: createInitialUserSettings(),
    lastMigrationAt: now,
  };
}
