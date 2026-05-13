import { type ExportPayload } from "@features/backup/server";
import { resolveSeedTopicId } from "@features/problems/server";
import { sanitizeStoredUserSettings } from "@features/settings/server";

import {
  Problem,
  StudyState,
  UserSettings,
} from "../../domain/types";
import {
  aggregates as v7AggregateDescriptors,
  EXPORTABLE_AGGREGATE_KEYS,
} from "../repositories/v7/aggregateRegistry";

import { CURRENT_STORAGE_SCHEMA_VERSION } from "./constants";
import {
  normalizeSlug,
  nowIso,
  parseDifficulty,
  slugToTitle,
  slugToUrl,
  uniqueStrings,
} from "./utils";

/**
 * v7 import allowlist. Aggregate keys are derived from the registry so
 * adding a new aggregate later is a single registry edit. The non-data
 * top-level fields ("version", "problems", "settings") plus the v6
 * legacy ones are listed explicitly.
 */

/**
 * Cross-walks legacy `topics: string[]` into v7 `topicIds: TopicId[]`.
 * Unknown topic strings are dropped — custom topics enter the registry
 * via the v7 topicRepository, not implicit imports.
 */
function deriveTopicIdsFromLabels(labels: readonly string[]): string[] {
  const out: string[] = [];
  for (const label of labels) {
    const resolved = resolveSeedTopicId(label);
    if (resolved && !out.includes(resolved)) out.push(resolved);
  }
  return out;
}

const ALLOWED_IMPORT_KEYS = new Set<string>([
  "version",
  // Legacy v6 wire shape — `problems: Problem[]` array (now also exported
  // as `problemsBySlug` via the registry; the array form is preserved for
  // backwards-compat imports of older backup files).
  "problems",
  "settings",
  // v7 aggregates — derived from the registry.
  ...EXPORTABLE_AGGREGATE_KEYS,
]);

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
    id: typeof problem.id === "string" && problem.id.trim() ? problem.id : slug,
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
    sourceSet: uniqueStrings(
      isStringArray(problem.sourceSet) ? problem.sourceSet : []
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

  // v7 aggregate fields are sanitised via the registry's per-aggregate
  // function. Derived sanitisers (which validate per-entity shape) live
  // alongside their entity in v7 land; here we just defer to the
  // registry's defensive Record/array filter so corrupt blobs don't
  // crash the importer.
  const v7Aggregates = sanitizeV7AggregatesFromPayload(payload);

  return {
    ...v7Aggregates,
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
 * the v7 aggregate fields that were present in the input — missing
 * fields stay missing so the spread doesn't introduce empty Records.
 */
function sanitizeV7AggregatesFromPayload(
  payload: ExportPayload,
): Partial<ExportPayload> {
  const out: Record<string, unknown> = {};
  const indexed = payload as unknown as Record<string, unknown>;
  for (const descriptor of v7AggregateDescriptors) {
    const raw = indexed[descriptor.key];
    if (raw === undefined) continue;
    out[descriptor.key] = descriptor.sanitize(raw);
  }
  return out as Partial<ExportPayload>;
}
