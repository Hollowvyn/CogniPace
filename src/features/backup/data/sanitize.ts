import {
  normalizeSlug,
  parseDifficulty,
  slugToTitle,
  slugToUrl,
} from "@features/problems";
import { resolveSeedTopicId } from "@features/problems/server";
import { sanitizeStoredUserSettings } from "@features/settings/server";
import { nowIso } from "@platform/time";
import { uniqueStrings } from "@shared/strings";

import { type ExportPayload } from "../domain/model";

import { STORAGE_SCHEMA_VERSION as CURRENT_STORAGE_SCHEMA_VERSION } from "./storageSchemaVersion";

import type { Problem } from "@features/problems";
import type { UserSettings } from "@features/settings";
import type { StudyState } from "@features/study";

/** Aggregate-root fields that an import payload may carry. The sanitizer
 *  defensively coerces each entry to a `Record<string, object>`; per-entity
 *  validation lives in the handler that consumes the sanitized payload. */
const AGGREGATE_KEYS = [
  "problemsBySlug",
  "studyStatesBySlug",
  "topicsById",
  "companiesById",
] as const;

const ALLOWED_IMPORT_KEYS = new Set<string>([
  "version",
  // Legacy v6 wire — `problems: Problem[]` array; modern exports also
  // carry it (alongside problemsBySlug) for back-compat with older imports.
  "problems",
  "settings",
  ...AGGREGATE_KEYS,
]);

/** Cross-walks legacy `topics: string[]` into v7 `topicIds: TopicId[]`.
 *  Unknown labels are dropped — custom topics enter via the topic repo. */
function deriveTopicIdsFromLabels(labels: readonly string[]): string[] {
  const out: string[] = [];
  for (const label of labels) {
    const resolved = resolveSeedTopicId(label);
    if (resolved && !out.includes(resolved)) out.push(resolved);
  }
  return out;
}

/** Defensive Record<string, object> coercion for aggregate-root fields.
 *  Drops non-object inputs and non-object entries. */
function sanitizeRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!key) continue;
    if (value === null || typeof value !== "object") continue;
    out[key] = value;
  }
  return out;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureAllowedKeys(payload: UnknownRecord): void {
  for (const key of Object.keys(payload)) {
    if (!ALLOWED_IMPORT_KEYS.has(key)) {
      throw new Error(`Invalid import format: unexpected field "${key}".`);
    }
  }
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function safeBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function sanitizeProblem(problem: unknown, importedAt: string): Problem | null {
  if (!isRecord(problem)) {
    return null;
  }

  const slug = normalizeSlug(
    typeof problem.leetcodeSlug === "string" ? problem.leetcodeSlug : ""
  );
  if (!slug) {
    return null;
  }

  return {
    leetcodeSlug: slug,
    slug,
    leetcodeId:
      typeof problem.leetcodeId === "string" && problem.leetcodeId.trim()
        ? problem.leetcodeId
        : undefined,
    title:
      typeof problem.title === "string" && problem.title.trim()
        ? problem.title.trim()
        : slugToTitle(slug),
    difficulty: parseDifficulty(
      typeof problem.difficulty === "string" ? problem.difficulty : undefined
    ),
    isPremium: safeBoolean(problem.isPremium),
    url: slugToUrl(slug),
    topics: uniqueStrings(isStringArray(problem.topics) ? problem.topics : []),
    topicIds: (() => {
      const labels = uniqueStrings(
        isStringArray(problem.topics) ? problem.topics : []
      );
      const explicit = uniqueStrings(
        isStringArray((problem as { topicIds?: unknown }).topicIds)
          ? (problem as { topicIds: string[] }).topicIds
          : []
      );
      // If the import already carries v7 topicIds, trust them; otherwise
      // derive from the legacy `topics` labels via the curated seed.
      return explicit.length > 0 ? explicit : deriveTopicIdsFromLabels(labels);
    })(),
    companyIds: uniqueStrings(
      isStringArray((problem as { companyIds?: unknown }).companyIds)
        ? ((problem as { companyIds: string[] }).companyIds)
        : []
    ),
    createdAt:
      typeof problem.createdAt === "string" && problem.createdAt.trim()
        ? problem.createdAt
        : importedAt,
    updatedAt:
      typeof problem.updatedAt === "string" && problem.updatedAt.trim()
        ? problem.updatedAt
        : importedAt,
  };
}

function sanitizeStudyStatesBySlug(value: unknown): Record<string, StudyState> {
  if (!isRecord(value)) {
    return {};
  }

  const result: Record<string, StudyState> = {};
  for (const [slug, state] of Object.entries(value)) {
    const normalizedSlug = normalizeSlug(slug);
    if (!normalizedSlug || !isRecord(state)) {
      continue;
    }
    result[normalizedSlug] = state as unknown as StudyState;
  }
  return result;
}

function sanitizeSettings(value: unknown): UserSettings | undefined {
  // Reject anything that doesn't even carry the grouped nested-object
  // surface — backup payloads with no recognisable settings block
  // should fail loud rather than silently reset to defaults.
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    typeof (value as { notifications?: unknown }).notifications !== "object"
  ) {
    return undefined;
  }
  return sanitizeStoredUserSettings(value);
}


export function assertImportPayloadShape(
  payload: unknown
): asserts payload is ExportPayload {
  if (!isRecord(payload)) {
    throw new Error("Invalid import format: expected an object payload.");
  }

  ensureAllowedKeys(payload);

  if (!Array.isArray(payload.problems)) {
    throw new Error("Invalid import format: problems must be an array.");
  }

  if (
    "version" in payload &&
    payload.version !== undefined &&
    (typeof payload.version !== "number" || !Number.isInteger(payload.version))
  ) {
    throw new Error("Invalid import format: version must be an integer.");
  }

  if (
    "studyStatesBySlug" in payload &&
    payload.studyStatesBySlug !== undefined &&
    !isRecord(payload.studyStatesBySlug)
  ) {
    throw new Error(
      "Invalid import format: studyStatesBySlug must be an object."
    );
  }

  if (
    "settings" in payload &&
    payload.settings !== undefined &&
    !isRecord(payload.settings)
  ) {
    throw new Error("Invalid import format: settings must be an object.");
  }

}

export function sanitizeImportPayload(payload: ExportPayload): ExportPayload {
  assertImportPayloadShape(payload);

  if (payload.version !== undefined) {
    if (payload.version > CURRENT_STORAGE_SCHEMA_VERSION) {
      throw new Error(
        `Unsupported backup version: ${payload.version}. Current version is ${CURRENT_STORAGE_SCHEMA_VERSION}.`
      );
    }
  }

  const importedAt = nowIso();
  const problems = (payload.problems ?? [])
    .map((problem) => sanitizeProblem(problem, importedAt))
    .filter((problem): problem is Problem => problem !== null);

  // Aggregate fields are sanitised via the registry's per-aggregate
  // function. Per-entity validation lives alongside the respective
  // entity; here we just defer to the registry's defensive
  // Record/array filter so corrupt blobs don't crash the importer.
  const aggregateFields = sanitizeAggregatesFromPayload(payload);

  return {
    ...aggregateFields,
    version:
      payload.version === undefined
        ? undefined
        : CURRENT_STORAGE_SCHEMA_VERSION,
    problems,
    studyStatesBySlug: sanitizeStudyStatesBySlug(payload.studyStatesBySlug),
    settings: sanitizeSettings(payload.settings),
  };
}

/**
 * Iterates the aggregateRegistry's exportable keys and applies each
 * descriptor's sanitiser. Returns a partial ExportPayload carrying only
 * the aggregate fields that were present in the input — missing fields
 * stay missing so the spread doesn't introduce empty Records.
 */
function sanitizeAggregatesFromPayload(
  payload: ExportPayload,
): Partial<ExportPayload> {
  const out: Record<string, unknown> = {};
  const indexed = payload as unknown as Record<string, unknown>;
  for (const key of AGGREGATE_KEYS) {
    const raw = indexed[key];
    if (raw === undefined) continue;
    out[key] = sanitizeRecord(raw);
  }
  return out as Partial<ExportPayload>;
}
