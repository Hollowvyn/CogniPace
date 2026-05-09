/**
 * v7 AppData root — the single object persisted to chrome.storage.local.
 * Each `Record<id, Entity>` field corresponds to one aggregate's "table"
 * in the eventual SQLite migration. Background mutators read and return
 * an `AppDataV7` draft inside `mutateAppData`; only `appDataRepository`
 * performs storage IO.
 */
import type { ActiveFocus } from "../active-focus/model";
import type { Company } from "../companies/model";
import type { Problem } from "../problems/model";
import type { SetGroupId, StudySetId } from "../common/ids";
import type { StudySet } from "../sets/model";
import type { StudySetProgress } from "../sets/progress";
import type { StudyState } from "../study-state/model";
import type { Topic } from "../topics/model";
import type { UserSettings } from "../settings/model";

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
  /** StudySet aggregate (courses + flat + derived). */
  studySetsById: Record<string, StudySet>;
  /** User-curated ordering across all StudySets. */
  studySetOrder: StudySetId[];
  /** Per-StudySet progress, lazily created when the user focuses a set. */
  studySetProgressById: Record<string, StudySetProgress>;
  /** UserSettings (now carries `activeFocus` instead of `activeCourseId`). */
  settings: UserSettings;
  /** Optional ISO timestamp recorded by the v6→v7 migration. */
  lastMigrationAt?: string;
}

export type StudySetIdRef = StudySetId;
export type SetGroupIdRef = SetGroupId;
/** Field names the import/export layer treats as aggregate roots. */
export const APP_DATA_AGGREGATE_KEYS = [
  "problemsBySlug",
  "studyStatesBySlug",
  "topicsById",
  "companiesById",
  "studySetsById",
  "studySetOrder",
  "studySetProgressById",
] as const satisfies readonly (keyof AppDataV7)[];

export type AppDataAggregateKey = (typeof APP_DATA_AGGREGATE_KEYS)[number];

/**
 * The active-focus discriminator currently has only one variant
 * (`studySet`); kept as a discriminated union for forward-compat. Re-export
 * here for convenience of repository consumers.
 */
export type { ActiveFocus };
