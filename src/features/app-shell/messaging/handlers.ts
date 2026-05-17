/** Service-worker handlers for app-shell reads and extension page navigation. */
import {
  computeReviewStreakDays,
  summarizeAnalytics,
} from "@features/analytics/server";
import { listProblems } from "@features/problems/server";
import {
  buildRecommendedCandidates,
  buildTodayQueue,
} from "@features/queue/server";
import {
  createInitialUserSettings,
  getUserSettings,
} from "@features/settings/server";
import { getActiveTrackId, listTracks } from "@features/tracks/server";
import { validateExtensionPagePath } from "@libs/runtime-rpc/url";
import { extensionUrl, openTab } from "@platform/chrome/tabs";
import { getDb } from "@platform/db/instance";

import type { AppShellPayload, PopupShellPayload } from "../domain/model";
import type { AppData } from "../domain/model/AppData";
import type { Company, Problem, Topic } from "@features/problems";
import type { UserSettings } from "@features/settings";
import type { StudyState } from "@features/study";
import type { Track } from "@features/tracks";
import type { TrackId } from "@shared/ids";

/**
 * Reads every aggregate (problems, study states, topics, companies,
 * settings) from SQLite and assembles the legacy `AppData` shape that
 * the downstream view-builders still consume. The v7 chrome.storage
 * blob is retired — this is the only path into SQLite for app-shell
 * reads.
 */
async function loadAppShellData(): Promise<AppData> {
  const { db } = await getDb();
  const [settings, problems, session] = await Promise.all([
    getUserSettings(db),
    listProblems(db),  // one RQB call: problems + studyState + topics + companies
    getActiveTrackId(db),
  ]);

  // Build backward-compat lookup maps from the rich problems.
  const problemsBySlug: Record<string, Problem> = {};
  const studyStatesBySlug: Record<string, StudyState> = {};
  const topicsById: Record<string, Topic> = {};
  const companiesById: Record<string, Company> = {};
  for (const p of problems) {
    problemsBySlug[p.slug] = p;
    if (p.studyState) studyStatesBySlug[p.slug] = p.studyState;
    for (const t of p.topics) topicsById[t.id] = t;
    for (const c of p.companies) companiesById[c.id] = c;
  }

  return {
    problems,
    problemsBySlug,
    studyStatesBySlug,
    topicsById,
    companiesById,
    settings: settings ?? createInitialUserSettings(),
    focusedTrackId: session,
  };
}

async function loadTracks(): Promise<Track[]> {
  const { db } = await getDb();
  return listTracks(db);
}

function focusedTrackIdOf(data: AppData): TrackId | null {
  if (data.focusedTrackId) return data.focusedTrackId;

  const legacyActiveFocus = (data.settings as unknown as {
    activeFocus?: { kind?: unknown; id?: unknown };
  }).activeFocus;

  if (legacyActiveFocus?.kind === "track" && typeof legacyActiveFocus.id === "string") {
    return legacyActiveFocus.id as TrackId;
  }

  return null;
}

export function buildPopupShellPayload(
  data: AppData,
  tracks: readonly Track[],
  now = new Date(),
): PopupShellPayload {
  const queue = buildTodayQueue(data, now);
  const focusedTrackId = focusedTrackIdOf(data);
  const activeTrack = tracks.find(t => t.id === focusedTrackId) ?? null;
  const candidates = buildRecommendedCandidates(queue, undefined);

  return {
    settings: data.settings,
    popup: {
      dueCount: queue.dueCount,
      streakDays: computeReviewStreakDays(data, now),
      recommended: candidates[0] ?? null,
      recommendedCandidates: candidates,
    },
    problems: data.problems,
    activeTrack,
  };
}

export async function getPopupShellData(): Promise<PopupShellPayload> {
  const data = await loadAppShellData();
  const tracks = await loadTracks();
  return buildPopupShellPayload(data, tracks);
}

export async function getAppShellData(): Promise<AppShellPayload> {
  const data = await loadAppShellData();
  const tracks = await loadTracks();
  const now = new Date();
  const popupShell = buildPopupShellPayload(data, tracks, now);
  const queue = buildTodayQueue(data, now);
  const analytics = summarizeAnalytics(data, now);

  const topicChoices = Object.values(data.topicsById)
    .map((topic) => ({ id: topic.id, name: topic.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const companyChoices = Object.values(data.companiesById)
    .map((company) => ({ id: company.id, name: company.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    ...popupShell,
    queue,
    analytics,
    recommendedCandidates: popupShell.popup.recommendedCandidates,
    tracks,
    topicChoices,
    companyChoices,
  };
}

export async function getQueue(): Promise<ReturnType<typeof buildTodayQueue>> {
  const data = await loadAppShellData();
  return buildTodayQueue(data);
}

export async function getActiveTrack(): Promise<Track | null> {
  const { db } = await getDb();
  const [rawTracks, session] = await Promise.all([
    loadTracks(),
    getActiveTrackId(db),
  ]);
  if (!session) return null;
  return rawTracks.find(t => t.id === session) ?? null;
}

export async function getTracks(): Promise<{
  tracks: Track[];
  activeTrack: Track | null;
  settings: UserSettings;
}> {
  const { db } = await getDb();
  const [rawTracks, session, settings] = await Promise.all([
    loadTracks(),
    getActiveTrackId(db),
    getUserSettings(db),
  ]);
  const focusedTrackId = session;
  return {
    tracks: rawTracks,
    activeTrack: rawTracks.find(t => t.id === focusedTrackId) ?? null,
    settings: settings ?? createInitialUserSettings(),
  };
}

export async function getLibrary(): Promise<Problem[]> {
  const data = await loadAppShellData();
  return data.problems;
}

export async function openExtensionPage(
  payload: { path: string },
): Promise<{ opened: true }> {
  const path = validateExtensionPagePath(payload.path);
  await openTab(extensionUrl(path));
  return { opened: true as const };
}
