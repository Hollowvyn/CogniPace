/**
 * v7 AppData root — the single object persisted to extension storage.
 * Post-Phase-5: most aggregates (problems, study states, topics, companies,
 * tracks, settings) are SSoT in SQLite. The fields kept here exist solely
 * for transitional hydration into the legacy `AppData` shape that
 * non-migrated callers still read. Phase 8 will rip the blob entirely.
 */
import type { ActiveFocus } from "../active-focus/model";
import type { Company } from "../companies/model";
import type { Problem } from "../problems/model";
import type { Topic } from "../topics/model";
import type { UserSettings } from "@features/settings";
import type { StudyState } from "@features/study";

export const STORAGE_SCHEMA_VERSION_V7 = 7 as const;

export interface AppDataV7 {
  schemaVersion: typeof STORAGE_SCHEMA_VERSION_V7;
  /** Problem aggregate, keyed by canonical slug. */
  problemsBySlug: Record<string, Problem>;
  /** StudyState aggregate, sparse — only present after first review. */
  studyStatesBySlug: Record<string, StudyState>;
  /** Topic registry (curated seed + custom user topics). */
  topicsById: Record<string, Topic>;
  /** Company registry (curated seed + custom user companies). */
  companiesById: Record<string, Company>;
  /** UserSettings (carries `activeFocus`). */
  settings: UserSettings;
  /** Optional ISO timestamp recorded by the v6→v7 migration. */
  lastMigrationAt?: string;
}

/** Field names the import/export layer treats as aggregate roots. */
export const APP_DATA_AGGREGATE_KEYS = [
  "problemsBySlug",
  "studyStatesBySlug",
  "topicsById",
  "companiesById",
] as const satisfies readonly (keyof AppDataV7)[];

export type AppDataAggregateKey = (typeof APP_DATA_AGGREGATE_KEYS)[number];

/**
 * The active-focus discriminator currently has only one variant
 * (`track`); kept as a discriminated union for forward-compat. Re-export
 * here for convenience of repository consumers.
 */
export type { ActiveFocus };
