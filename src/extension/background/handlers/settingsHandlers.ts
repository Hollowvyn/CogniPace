/** Background handlers for settings and backup import/export operations. */
import {
  slugToTitle,
  slugToUrl,
  normalizeSlug,
  resolveSeedTopicId,
  listCompanies,
  upsertCompany,
  listProblems,
  upsertProblem,
  listTopics,
  upsertTopic,
} from "@features/problems/server";
import {
  createInitialUserSettings,
  getUserSettings,
  mergeUserSettings,
  saveUserSettings,
} from "@features/settings/server";
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
import { uniqueStrings } from "@libs/collections";
import { normalizeStudyState } from "@libs/fsrs/studyState";
import { getDb } from "@platform/db/instance";
import { nowIso } from "@platform/time";
import {
  asCompanyId,
  asProblemSlug,
  asTopicId,
  asTrackGroupId,
  asTrackId,
} from "@shared/ids";


import { sanitizeImportPayload } from "../../../data/importexport/backup";
import { getAppData } from "../../../data/repositories/appDataRepository";
import { CURRENT_STORAGE_SCHEMA_VERSION } from "../../../data/repositories/v7/constants";
import { StudyState } from "../../../domain/types";
import { ok } from "../responses";

import type { ExportPayload } from "@features/backup/server";
import type { Company , Topic } from "@features/problems";

/** Cross-walks legacy topics labels into v7 topicIds via the curated seed. */
function deriveTopicIdsFromLabels(labels: readonly string[]): string[] {
  const out: string[] = [];
  for (const label of labels) {
    const resolved = resolveSeedTopicId(label);
    if (resolved && !out.includes(resolved)) out.push(resolved);
  }
  return out;
}

/** Exports the full persisted backup payload. Every aggregate
 * (topics, companies, settings, problems, studyStates, tracks) reads
 * through its SQLite repo — the v7 blob is no longer consulted. */
export async function exportData() {
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
  return ok({
    version: CURRENT_STORAGE_SCHEMA_VERSION,
    problems,
    studyStatesBySlug,
    settings: settings ?? data.settings,
    topicsById,
    companiesById,
    tracks,
  });
}

/** Imports a sanitized backup payload into persisted app data. */
export async function importData(payload: ExportPayload) {
  const sanitized = sanitizeImportPayload(payload);
  const { db } = await getDb();

  // Route every SQLite-backed aggregate through its repo. Curated rows
  // already exist via SW boot seed — upsert is a safe no-op for matching
  // rows; user-custom rows in the payload land as isCustom=true.
  if (sanitized.settings) {
    const current = (await getUserSettings(db)) ?? createInitialUserSettings();
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
  // Problems: upsert each via the SQLite repo. The v7 export carries
  // them as the transitional v6/v7 Problem shape with `topics: string[]`
  // legacy labels — we resolve those into canonical topicIds when the
  // import doesn't provide topicIds directly.
  for (const problem of sanitized.problems) {
    const slug = normalizeSlug(problem.leetcodeSlug);
    if (!slug) continue;
    const now = nowIso();
    const labels = uniqueStrings(problem.topics ?? []);
    const importedTopicIds = uniqueStrings(problem.topicIds ?? []);
    const finalTopicIds =
      importedTopicIds.length > 0
        ? importedTopicIds
        : deriveTopicIdsFromLabels(labels);
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
  // StudyStates: write the row + replay attempts via the repo so the
  // attempt_history table mirrors the imported attemptHistory[].
  for (const [slug, state] of Object.entries(
    sanitized.studyStatesBySlug ?? {},
  )) {
    const normalizedSlug = normalizeSlug(slug);
    if (!normalizedSlug) continue;
    const normalized = normalizeStudyState(state as StudyState);
    const branded = asProblemSlug(normalizedSlug);
    // Upsert the row first (FK constraint requires the parent problem).
    // We assume the upsertProblem loop above already created it; if not
    // (import payload had a study state for a slug with no problem),
    // FK throws — that's a real import-payload bug.
    await upsertStudyState(db, branded, normalized);
    for (const entry of normalized.attemptHistory) {
      await appendAttempt(db, branded, entry);
    }
  }
  // Tracks: each track + its groups + group-problem memberships goes
  // through the SQLite repo. We never touch curated rows here — the SW
  // boot seeded them already; this loop only handles user-defined tracks
  // (charter — curated tracks live in catalog code, not import payloads).
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

  return ok({ imported: true });
}

// updateSettings moved to features/settings/messaging/handlers.ts in
// Phase 6. The router now imports it directly from
// @features/settings/server.

/** Clears all local study history while preserving settings, tracks, and the problem library. */
export async function resetStudyHistory() {
  // SQLite owns study_states + attempt_history. Wiping those tables
  // also clears every per-track completion (track progress is derived
  // from attempt history — no separate aggregate to reset).
  const { db } = await getDb();
  await clearAllStudyHistory(db);
  return ok({ reset: true });
}
