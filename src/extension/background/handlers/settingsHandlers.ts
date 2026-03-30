/** Background handlers for settings and backup import/export operations. */
import { sanitizeImportPayload } from "../../../data/importexport/backup";
import {
  getAppData,
  mergeSettings,
  mutateAppData,
} from "../../../data/repositories/appDataRepository";
import { uniqueStrings } from "../../../domain/common/collections";
import {
  CURRENT_STORAGE_SCHEMA_VERSION,
} from "../../../domain/common/constants";
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

/** Exports the full persisted backup payload. */
export async function exportData() {
  const data = await getAppData();
  return ok({
    version: CURRENT_STORAGE_SCHEMA_VERSION,
    problems: Object.values(data.problemsBySlug),
    studyStatesBySlug: data.studyStatesBySlug,
    settings: data.settings,
    coursesById: data.coursesById,
    courseOrder: data.courseOrder,
    courseProgressById: data.courseProgressById,
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
      data.problemsBySlug[slug] = {
        id: problem.id || slug,
        leetcodeSlug: slug,
        leetcodeId: problem.leetcodeId,
        title: problem.title?.trim() || slugToTitle(slug),
        difficulty: problem.difficulty ?? "Unknown",
        url: slugToUrl(slug),
        topics: uniqueStrings(problem.topics ?? []),
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
