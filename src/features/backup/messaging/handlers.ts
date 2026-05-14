/** Service-worker handlers for backup export, import, and pre-v7 migration. */
import {
  listCompanies,
  listProblems,
  listTopics,
  normalizeSlug,
  resolveSeedTopicId,
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
import { ResultAsync } from "neverthrow";

import { sanitizeImportPayload } from "../../../data/importexport/backup";
import {
  getAppData,
  PRE_V7_BACKUP_KEY,
} from "../../../data/repositories/appDataRepository";
import { CURRENT_STORAGE_SCHEMA_VERSION } from "../../../data/repositories/v7/constants";

import type { ExportPayload } from "../domain/model";
import type { Company, Topic } from "@features/problems";

const toErrMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

function topicIdsFromLabels(labels: readonly string[]): string[] {
  const out: string[] = [];
  for (const label of labels) {
    const resolved = resolveSeedTopicId(label);
    if (resolved && !out.includes(resolved)) out.push(resolved);
  }
  return out;
}

export function exportData(): ResultAsync<ExportPayload, string> {
  return ResultAsync.fromPromise(
    (async () => {
      const data = await getAppData();
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
        settings: settings ?? data.settings,
        topicsById,
        companiesById,
        tracks,
      } as ExportPayload;
    })(),
    toErrMsg,
  );
}

export function importData(
  payload: ExportPayload,
): ResultAsync<{ imported: true }, string> {
  return ResultAsync.fromPromise(
    (async () => {
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
        const slug = normalizeSlug(problem.leetcodeSlug);
        if (!slug) continue;
        const now = nowIso();
        const labels = uniqueStrings(problem.topics ?? []);
        const importedTopicIds = uniqueStrings(problem.topicIds ?? []);
        const finalTopicIds =
          importedTopicIds.length > 0
            ? importedTopicIds
            : topicIdsFromLabels(labels);
        await upsertProblem(db, {
          id: problem.id || slug,
          leetcodeSlug: slug,
          slug,
          leetcodeId: problem.leetcodeId,
          title: problem.title?.trim() || slugToTitle(slug),
          difficulty: problem.difficulty ?? "Unknown",
          isPremium: problem.isPremium,
          url: slugToUrl(slug),
          topics: labels,
          topicIds: finalTopicIds,
          companyIds: uniqueStrings(problem.companyIds ?? []),
          sourceSet: uniqueStrings(problem.sourceSet ?? []),
          createdAt: problem.createdAt || now,
          updatedAt: problem.updatedAt || now,
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
        for (const incoming of sanitized.tracks) {
          if (incoming.isCurated) continue;
          const trackId = asTrackId(incoming.id);
          const created = await createTrack(db, {
            id: trackId,
            name: incoming.name,
            description: incoming.description,
            enabled: incoming.enabled,
            isCurated: false,
            orderIndex: incoming.orderIndex,
          });
          for (const group of incoming.groups) {
            const groupId = asTrackGroupId(group.id);
            await addGroup(db, {
              id: groupId,
              trackId: created.id,
              topicId: group.topicId,
              name: group.name,
              description: group.description,
              orderIndex: group.orderIndex,
            });
            for (const membership of group.problems) {
              await addProblemToGroup(db, {
                groupId,
                problemSlug: asProblemSlug(membership.problemSlug),
                orderIndex: membership.orderIndex,
              });
            }
          }
        }
      }

      return { imported: true as const };
    })(),
    toErrMsg,
  );
}

export function resetStudyHistory(): ResultAsync<{ reset: true }, string> {
  return ResultAsync.fromPromise(
    (async () => {
      const { db } = await getDb();
      await clearAllStudyHistory(db);
      return { reset: true as const };
    })(),
    toErrMsg,
  );
}

export function consumePreV7BackupHandler(): ResultAsync<
  { backup: unknown },
  string
> {
  return ResultAsync.fromPromise(
    (async () => {
      const result = await readLocalStorage([PRE_V7_BACKUP_KEY]);
      const blob = result[PRE_V7_BACKUP_KEY];
      if (!blob) return { backup: null };
      await removeLocalStorage([PRE_V7_BACKUP_KEY]);
      return { backup: blob };
    })(),
    toErrMsg,
  );
}
