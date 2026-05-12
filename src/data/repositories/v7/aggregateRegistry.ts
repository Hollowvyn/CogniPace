/**
 * Aggregate registry — the single source of truth for which AppDataV7
 * fields are aggregate roots in the v7 blob. The import/export pipeline
 * derives its key set from this registry.
 *
 * Post-Phase-5 tracks slice: tracks no longer live on the blob, so the
 * three StudySet keys (`studySetsById`, `studySetOrder`,
 * `studySetProgressById`) are gone. Backups now read/write the
 * `tracks` aggregate at handler time via the SQLite repo.
 */
import type { AppDataAggregateKey, AppDataV7 } from "../../../domain/data/appDataV7";

export interface AggregateDescriptor {
  /** AppDataV7 field key. */
  key: AppDataAggregateKey;
  /** True when the field participates in import/export round-trips. */
  exportable: boolean;
  /** Pure sanitiser — defensive parser for untrusted input. */
  sanitize: (input: unknown) => AppDataV7[AppDataAggregateKey];
}

export const aggregates: readonly AggregateDescriptor[] = [
  {
    key: "problemsBySlug",
    exportable: true,
    sanitize: sanitizeRecord,
  },
  {
    key: "studyStatesBySlug",
    exportable: true,
    sanitize: sanitizeRecord,
  },
  {
    key: "topicsById",
    exportable: true,
    sanitize: sanitizeRecord,
  },
  {
    key: "companiesById",
    exportable: true,
    sanitize: sanitizeRecord,
  },
] as const;

/** Allowed keys at the top level of an `ExportPayload` for v7. */
export const EXPORTABLE_AGGREGATE_KEYS: readonly AppDataAggregateKey[] =
  aggregates.filter((a) => a.exportable).map((a) => a.key);

/**
 * Defensive sanitiser for `Record<string, unknown>` aggregate fields.
 * Drops non-object inputs and non-object entries, preserving the shape.
 * Per-entity validation is the responsibility of the corresponding
 * sanitiser used by the migration pipeline.
 */
function sanitizeRecord(input: unknown): AppDataV7[AppDataAggregateKey] {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {} as AppDataV7[AppDataAggregateKey];
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!key) continue;
    if (value === null || typeof value !== "object") continue;
    out[key] = value;
  }
  return out as AppDataV7[AppDataAggregateKey];
}
