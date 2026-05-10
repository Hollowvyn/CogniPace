/** Background handlers for settings and backup import/export operations. */
import { sanitizeImportPayload } from "../../../data/importexport/backup";
import {
  getAppData,
  mergeSettings,
  mutateAppData,
} from "../../../data/repositories/appDataRepository";
import { resolveSeedTopicId } from "../../../data/catalog/topicsSeed";
import { uniqueStrings } from "../../../domain/common/collections";
import { CURRENT_STORAGE_SCHEMA_VERSION } from "../../../domain/common/constants";
import { nowIso } from "../../../domain/common/time";
import {
  ensureCourseData,
  syncCourseProgress,
} from "../../../domain/courses/courseProgress";
import { normalizeStudyState } from "../../../domain/fsrs/studyState";
import {
  slugToTitle,
  slugToUrl,
  normalizeSlug,
} from "../../../domain/problem/slug";
import { ExportPayload, StudyState } from "../../../domain/types";
import { ok } from "../responses";

/** Cross-walks legacy topics labels into v7 topicIds via the curated seed. */
function deriveTopicIdsFromLabels(labels: readonly string[]): string[] {
  const out: string[] = [];
  for (const label of labels) {
    const resolved = resolveSeedTopicId(label);
    if (resolved && !out.includes(resolved)) out.push(resolved);
  }
  return out;
}

/** Exports the full persisted backup payload. */
export async function exportData() {
  const data = await getAppData();
  return ok({
    version: CURRENT_STORAGE_SCHEMA_VERSION,
    problems: Object.values(data.problemsBySlug),
    studyStatesBySlug: data.studyStatesBySlug,
    settings: data.settings,
    // v6 legacy fields — preserved in the export for backward-compat
    // imports of older backup files until Phase F.3 drops them.
    coursesById: data.coursesById,
    courseOrder: data.courseOrder,
    courseProgressById: data.courseProgressById,
    // v7 aggregates — every key is an aggregate root from the registry.
    topicsById: data.topicsById,
    companiesById: data.companiesById,
    studySetsById: data.studySetsById,
    studySetOrder: data.studySetOrder,
    studySetProgressById: data.studySetProgressById,
  });
}

/** Imports a sanitized backup payload into persisted app data. */
export async function importData(payload: ExportPayload) {
  const sanitized = sanitizeImportPayload(payload);

  await mutateAppData((data) => {
    data.problemsBySlug = {};
    data.studyStatesBySlug = {};
    data.coursesById = sanitized.coursesById ?? {};
    data.courseOrder = sanitized.courseOrder ?? [];
    data.courseProgressById = sanitized.courseProgressById ?? {};

    for (const problem of sanitized.problems) {
      const slug = normalizeSlug(problem.leetcodeSlug);
      if (!slug) {
        continue;
      }

      const now = nowIso();
      const labels = uniqueStrings(problem.topics ?? []);
      const importedTopicIds = uniqueStrings(problem.topicIds ?? []);
      data.problemsBySlug[slug] = {
        id: problem.id || slug,
        leetcodeSlug: slug,
        slug,
        leetcodeId: problem.leetcodeId,
        title: problem.title?.trim() || slugToTitle(slug),
        difficulty: problem.difficulty ?? "Unknown",
        isPremium: problem.isPremium,
        url: slugToUrl(slug),
        topics: labels,
        topicIds:
          importedTopicIds.length > 0
            ? importedTopicIds
            : deriveTopicIdsFromLabels(labels),
        companyIds: uniqueStrings(problem.companyIds ?? []),
        sourceSet: uniqueStrings(problem.sourceSet ?? []),
        createdAt: problem.createdAt || now,
        updatedAt: problem.updatedAt || now,
      };
    }

    for (const [slug, state] of Object.entries(
      sanitized.studyStatesBySlug ?? {}
    )) {
      const normalizedSlug = normalizeSlug(slug);
      if (!normalizedSlug) {
        continue;
      }
      data.studyStatesBySlug[normalizedSlug] = normalizeStudyState(
        state as StudyState
      );
    }

    // v7 aggregates — sanitised by the registry; replace whole maps so
    // the import is the single source of truth for the new state.
    if (sanitized.topicsById) data.topicsById = sanitized.topicsById;
    if (sanitized.companiesById) data.companiesById = sanitized.companiesById;
    if (sanitized.studySetsById) data.studySetsById = sanitized.studySetsById;
    if (sanitized.studySetOrder) data.studySetOrder = sanitized.studySetOrder;
    if (sanitized.studySetProgressById) {
      data.studySetProgressById = sanitized.studySetProgressById;
    }

    data.settings = mergeSettings(data.settings, sanitized.settings ?? {});
    ensureCourseData(data);
    syncCourseProgress(data);
    return data;
  });

  return ok({ imported: true });
}

/** Applies a settings patch and returns the normalized saved settings. */
export async function updateSettings(payload: Record<string, unknown>) {
  const updated = await mutateAppData((data) => {
    data.settings = mergeSettings(data.settings, payload);
    ensureCourseData(data);
    syncCourseProgress(data);
    return data;
  });

  return ok({ settings: updated.settings });
}

/** Clears all local study history while preserving settings, courses, and the problem library. */
export async function resetStudyHistory() {
  await mutateAppData((data) => {
    data.studyStatesBySlug = {};
    data.courseProgressById = {};
    ensureCourseData(data);
    syncCourseProgress(data);
    return data;
  });

  return ok({ reset: true });
}
