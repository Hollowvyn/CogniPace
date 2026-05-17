/** Service-worker handlers for backup export, import, and pre-v7 migration. */
import {
  listCompanies,
  listProblems,
  listTopics,
  normalizeSlug,
  slugToTitle,
  slugToUrl,
  upsertCompany,
  upsertProblem,
  upsertTopic,
} from "@features/problems/server";
import {
  createInitialUserSettings,
  getUserSettings,
  mergeUserSettings,
  saveUserSettings,
} from "@features/settings/server";
import { StudyState } from "@features/study";
import {
  appendAttempt,
  clearAllStudyHistory,
  listStudyStates,
  upsertStudyState,
} from "@features/study/server";
import {
  addGroup,
  addProblemToGroup,
  createTrack,
  listTracks,
} from "@features/tracks/server";
import { normalizeStudyState } from "@libs/fsrs/studyState";
import {
  readLocalStorage,
  removeLocalStorage,
} from "@platform/chrome/storage";
import { getDb } from "@platform/db/instance";
import { nowIso } from "@platform/time";
import {
  asCompanyId,
  asProblemSlug,
  asTopicId,
  asTrackGroupId,
  asTrackId,
} from "@shared/ids";
import { uniqueStrings } from "@shared/strings";

import { sanitizeImportPayload } from "../data/sanitize";
import { STORAGE_SCHEMA_VERSION as CURRENT_STORAGE_SCHEMA_VERSION } from "../data/storageSchemaVersion";

import type { ExportPayload } from "../domain/model";
import type { Company, Topic } from "@features/problems";

/**
 * Sidecar key holding the pre-v7 chrome.storage blob produced by the
 * one-shot v6→v7→SQLite migration. The blob path is retired but legacy
 * users may still have this key in storage; we surface it once for
 * download then clear it.
 */
const PRE_V7_BACKUP_KEY = "leetcode_spaced_repetition_data_v2_pre_v7_backup";

export async function exportData(): Promise<ExportPayload> {
  const { db } = await getDb();
  const topics = await listTopics(db);
  const companies = await listCompanies(db);
  const problems = await listProblems(db);
  const studyStatesBySlug = await listStudyStates(db);
  const settings = await getUserSettings(db);
  const tracks = await listTracks(db);
  const topicsById: Record<string, Topic> = {};
  for (const t of topics) topicsById[t.id] = t;
  const companiesById: Record<string, Company> = {};
  for (const c of companies) companiesById[c.id] = c;
  return {
    version: CURRENT_STORAGE_SCHEMA_VERSION,
    problems,
    studyStatesBySlug,
    settings: settings ?? createInitialUserSettings(),
    topicsById,
    companiesById,
    tracks,
  } as ExportPayload;
}

export async function importData(
  payload: ExportPayload,
): Promise<{ imported: true }> {
  const sanitized = sanitizeImportPayload(payload);
  const { db } = await getDb();

  if (sanitized.settings) {
    const current =
      (await getUserSettings(db)) ?? createInitialUserSettings();
    const merged = mergeUserSettings(current, sanitized.settings);
    await saveUserSettings(db, merged);
  }
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
  for (const problem of sanitized.problems) {
    const slug = problem.slug;
    if (!slug) continue;
    const now = nowIso();
    await upsertProblem(db, {
      slug,
      leetcodeId: problem.leetcodeId,
      title: problem.title?.trim() || slugToTitle(slug),
      difficulty: problem.difficulty ?? "Unknown",
      isPremium: problem.isPremium,
      url: slugToUrl(slug),
      topicIds: uniqueStrings(problem.topicIds ?? []),
      companyIds: uniqueStrings(problem.companyIds ?? []),
      createdAt: problem.createdAt || now,
      updatedAt: problem.updatedAt || now,
      studyState: null,
      topics: [],
      companies: [],
    });
  }
  for (const [slug, state] of Object.entries(
    sanitized.studyStatesBySlug ?? {},
  )) {
    const normalizedSlug = normalizeSlug(slug);
    if (!normalizedSlug) continue;
    const normalized = normalizeStudyState(state as StudyState);
    const branded = asProblemSlug(normalizedSlug);
    await upsertStudyState(db, branded, normalized);
    for (const entry of normalized.attemptHistory) {
      await appendAttempt(db, branded, entry);
    }
  }
  if (sanitized.tracks) {
    for (const [trackIndex, incoming] of sanitized.tracks.entries()) {
      if (incoming.isCurated) continue;
      const trackId = asTrackId(incoming.id);
      const created = await createTrack(db, {
        id: trackId,
        name: incoming.name,
        description: incoming.description,
        enabled: incoming.enabled,
        isCurated: false,
        orderIndex: trackIndex,
      });
      for (const [groupIndex, group] of incoming.groups.entries()) {
        const groupId = asTrackGroupId(group.id);
        await addGroup(db, {
          id: groupId,
          trackId: created.id,
          topicId: group.topicId,
          name: group.name,
          description: group.description,
          orderIndex: groupIndex,
        });
        for (const [problemIndex, problem] of group.problems.entries()) {
          await addProblemToGroup(db, {
            groupId,
            problemSlug: asProblemSlug(problem.slug),
            orderIndex: problemIndex,
          });
        }
      }
    }
  }

  return { imported: true as const };
}

export async function resetStudyHistory(): Promise<{ reset: true }> {
  const { db } = await getDb();
  await clearAllStudyHistory(db);
  return { reset: true as const };
}

export async function consumePreV7BackupHandler(): Promise<{ backup: unknown }> {
  const result = await readLocalStorage([PRE_V7_BACKUP_KEY]);
  const blob = result[PRE_V7_BACKUP_KEY];
  if (!blob) return { backup: null };
  await removeLocalStorage([PRE_V7_BACKUP_KEY]);
  return { backup: blob };
}
