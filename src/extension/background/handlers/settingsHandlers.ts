/** Background handlers for settings and backup import/export operations. */
import { resolveSeedTopicId } from "../../../data/catalog/topicsSeed";
import {
  listCompanies,
  upsertCompany,
} from "../../../data/companies/repository";
import { getDb } from "../../../data/db/instance";
import { sanitizeImportPayload } from "../../../data/importexport/backup";
import {
  getAppData,
  mergeSettings,
  mutateAppData,
} from "../../../data/repositories/appDataRepository";
import {
  getUserSettings,
  saveUserSettings,
} from "../../../data/settings/repository";
import { listTopics, upsertTopic } from "../../../data/topics/repository";
import { uniqueStrings } from "../../../domain/common/collections";
import { CURRENT_STORAGE_SCHEMA_VERSION } from "../../../domain/common/constants";
import { asCompanyId, asTopicId } from "../../../domain/common/ids";
import { nowIso } from "../../../domain/common/time";
import { normalizeStudyState } from "../../../domain/fsrs/studyState";
import {
  slugToTitle,
  slugToUrl,
  normalizeSlug,
} from "../../../domain/problem/slug";
import {
  createInitialUserSettings,
  mergeUserSettings,
} from "../../../domain/settings";
import { ExportPayload, StudyState } from "../../../domain/types";
import { ok } from "../responses";

import type { Company } from "../../../domain/companies/model";
import type { Topic } from "../../../domain/topics/model";

/** Cross-walks legacy topics labels into v7 topicIds via the curated seed. */
function deriveTopicIdsFromLabels(labels: readonly string[]): string[] {
  const out: string[] = [];
  for (const label of labels) {
    const resolved = resolveSeedTopicId(label);
    if (resolved && !out.includes(resolved)) out.push(resolved);
  }
  return out;
}

/** Exports the full persisted backup payload. Topics + companies come
 * from SQLite (Phase 4+5 SSoT); the remaining aggregates still come
 * from the v7 blob until later phases migrate them. */
export async function exportData() {
  const data = await getAppData();
  const { db } = await getDb();
  const topics = await listTopics(db);
  const companies = await listCompanies(db);
  const topicsById: Record<string, Topic> = {};
  for (const t of topics) topicsById[t.id] = t;
  const companiesById: Record<string, Company> = {};
  for (const c of companies) companiesById[c.id] = c;
  return ok({
    version: CURRENT_STORAGE_SCHEMA_VERSION,
    problems: Object.values(data.problemsBySlug),
    studyStatesBySlug: data.studyStatesBySlug,
    settings: data.settings,
    topicsById,
    companiesById,
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

    // v7 aggregates other than topics + companies — sanitised by the
    // registry; replace whole maps so the import is the single source of
    // truth. Topics and companies are handled separately below via the
    // SQLite repos.
    if (sanitized.studySetsById) data.studySetsById = sanitized.studySetsById;
    if (sanitized.studySetOrder) data.studySetOrder = sanitized.studySetOrder;
    if (sanitized.studySetProgressById) {
      data.studySetProgressById = sanitized.studySetProgressById;
    }

    // Settings live in SQLite (Phase 5); do not write through the
    // mutateAppData path. The SQLite merge happens below the
    // mutateAppData await.
    return data;
  });

  // Route imported topics + companies + settings through SQLite
  // (Phase 4+5 SSoT). Curated rows are seeded at SW boot — re-importing
  // them via upsert is a safe no-op for matching rows; user-custom rows
  // in the payload land as isCustom=true and become editable.
  const { db } = await getDb();
  if (sanitized.settings) {
    const current = (await getUserSettings(db)) ?? createInitialUserSettings();
    const merged = mergeUserSettings(current, sanitized.settings);
    await saveUserSettings(db, merged);
  }
  if (sanitized.topicsById || sanitized.companiesById) {
    if (sanitized.topicsById) {
      for (const topic of Object.values(sanitized.topicsById)) {
        await upsertTopic(db, {
          id: asTopicId(topic.id),
          name: topic.name,
          description: topic.description,
          isCustom: topic.isCustom,
        });
      }
    }
    if (sanitized.companiesById) {
      for (const company of Object.values(sanitized.companiesById)) {
        await upsertCompany(db, {
          id: asCompanyId(company.id),
          name: company.name,
          description: company.description,
          isCustom: company.isCustom,
        });
      }
    }
  }

  return ok({ imported: true });
}

/** Applies a settings patch and returns the normalized saved settings.
 * Phase 5: settings live in SQLite, not the v7 blob — the merge runs
 * against the SQLite copy and the write path returns the round-tripped
 * value (charter lesson #6) so the UI's next read matches. */
export async function updateSettings(payload: Record<string, unknown>) {
  const { db } = await getDb();
  const current = (await getUserSettings(db)) ?? createInitialUserSettings();
  const merged = mergeSettings(current, payload);
  const saved = await saveUserSettings(db, merged);
  return ok({ settings: saved });
}

/** Clears all local study history while preserving settings, courses, and the problem library. */
export async function resetStudyHistory() {
  await mutateAppData((data) => {
    data.studyStatesBySlug = {};
    data.studySetProgressById = {};
    return data;
  });

  return ok({ reset: true });
}
