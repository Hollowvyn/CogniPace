/**
 * Builds a fresh v7 AppData snapshot. Used both at first launch (no
 * stored data) and during the v6→v7 migration (after the v6 sidecar
 * backup has been written).
 */
import { STORAGE_SCHEMA_VERSION_V7 } from "../../../domain/data/appDataV7";
import { createInitialUserSettings } from "../../../domain/settings";
import { buildCompanySeed } from "../../catalog/companiesSeed";
import { listCatalogPlans } from "../../catalog/curatedSets";
import { buildStudySetSeed } from "../../catalog/studySetsSeed";
import { buildTopicSeed } from "../../catalog/topicsSeed";

import type { AppDataV7 } from "../../../domain/data/appDataV7";

/** Returns the freshly-seeded v7 AppData. `now` is used as the createdAt /
 * updatedAt for every seeded entity so the snapshot is deterministic. */
export function buildFreshAppDataV7(now: string): AppDataV7 {
  const topicsById = buildTopicSeed(now);
  const companiesById = buildCompanySeed(now);
  const { studySetsById, studySetOrder } = buildStudySetSeed(
    listCatalogPlans(),
    now,
  );

  return {
    schemaVersion: STORAGE_SCHEMA_VERSION_V7,
    problemsBySlug: {},
    studyStatesBySlug: {},
    topicsById,
    companiesById,
    studySetsById,
    studySetOrder,
    studySetProgressById: {},
    settings: createInitialUserSettings(),
    lastMigrationAt: now,
  };
}
