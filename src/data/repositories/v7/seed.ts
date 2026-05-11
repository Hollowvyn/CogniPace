/**
 * Builds a fresh v7 AppData snapshot. Used both at first launch (no
 * stored data) and during the v6→v7 migration (after the v6 sidecar
 * backup has been written).
 */
import { STORAGE_SCHEMA_VERSION_V7 } from "../../../domain/data/appDataV7";
import { createInitialUserSettings } from "../../../domain/settings";
import { buildCompanySeed } from "../../catalog/companiesSeed";
import { listCatalogPlans } from "../../catalog/curatedSets";
import { buildProblemSeed } from "../../catalog/problemsSeed";
import { buildStudySetSeed } from "../../catalog/studySetsSeed";

import type { AppDataV7 } from "../../../domain/data/appDataV7";

/** Returns the freshly-seeded v7 AppData. `now` is used as the createdAt /
 * updatedAt for every seeded entity so the snapshot is deterministic.
 *
 * Phase 4: topics are the source of truth in SQLite, not the v7 blob.
 * `topicsById` is intentionally `{}` here — the SW boot seeds the
 * SQLite catalog, the dashboard handler hydrates `data.topicsById` at
 * read time. The field stays in the type only because the v7 blob
 * format still nominally carries it during the transitional period.
 */
export function buildFreshAppDataV7(now: string): AppDataV7 {
  const plans = listCatalogPlans();
  const companiesById = buildCompanySeed(now);
  const { studySetsById, studySetOrder } = buildStudySetSeed(plans, now);
  const problemsBySlug = buildProblemSeed(plans, now);

  return {
    schemaVersion: STORAGE_SCHEMA_VERSION_V7,
    problemsBySlug:
      problemsBySlug as unknown as AppDataV7["problemsBySlug"],
    studyStatesBySlug: {},
    topicsById: {},
    companiesById,
    studySetsById,
    studySetOrder,
    studySetProgressById: {},
    settings: createInitialUserSettings(),
    lastMigrationAt: now,
  };
}
