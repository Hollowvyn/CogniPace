/** Service-worker handlers for app-shell reads and extension page navigation. */
import {
  computeReviewStreakDays,
  summarizeAnalytics,
} from "@features/analytics/server";
import { slugToTitle, slugToUrl } from "@features/problems";
import { listProblems } from "@features/problems/server";
import {
  buildRecommendedCandidates,
  buildTodayQueue,
  effectivelySuspendedFlag,
} from "@features/queue/server";
import { createInitialUserSettings, getUserSettings } from "@features/settings/server";
import { buildActiveTrackView, getActiveTrackId, listTracks } from "@features/tracks/server";
import { validateExtensionPagePath } from "@libs/runtime-rpc/url";
import { extensionUrl, openTab } from "@platform/chrome/tabs";
import { getDb } from "@platform/db/instance";

import {
  buildProblemView,
  buildStudyStateView,
  buildTrackView,
} from "../domain/policy/hydrate";

import type { AppShellPayload, PopupShellPayload } from "../domain/model";
import type { AppData } from "../domain/model/AppData";
import type {
  Company,
  LibraryProblemRow,
  Problem,
  Topic,
} from "@features/problems";
import type { StudyState } from "@features/study";
import type {
  ActiveTrackView,
  TrackCardView,
  TrackMembership,
  TrackView,
  TrackWithGroups,
} from "@features/tracks";
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
    activeTrackId: session,
  };
}

async function loadTracks(): Promise<TrackWithGroups[]> {
  const { db } = await getDb();
  return listTracks(db);
}

function trackMembershipsForSlug(
  tracks: readonly TrackWithGroups[],
  slug: string,
): TrackMembership[] {
  const out: TrackMembership[] = [];
  for (const track of tracks) {
    for (const group of track.groups) {
      const found = group.problems.find((m) => m.problemSlug === slug);
      if (found) {
        out.push({
          trackId: track.id,
          trackName: track.name,
          groupId: group.id,
          groupName: group.name,
        });
        break;
      }
    }
  }
  return out;
}

function buildTrackViews(
  data: AppData,
  tracks: readonly TrackWithGroups[],
  now: Date,
): TrackView[] {
  return tracks.map((track) =>
    buildTrackView({
      track,
      problemsBySlug: data.problemsBySlug as unknown as Parameters<
        typeof buildTrackView
      >[0]["problemsBySlug"],
      topicsById: data.topicsById,
      companiesById: data.companiesById,
      studyStatesBySlug: data.studyStatesBySlug as unknown as Parameters<
        typeof buildTrackView
      >[0]["studyStatesBySlug"],
      now,
    }),
  );
}

function activeTrackViewOf(
  data: AppData,
  trackViews: readonly TrackView[],
): TrackView | null {
  const focusedId = focusedTrackIdOf(data);
  if (!focusedId) return null;
  return trackViews.find((view) => view.id === focusedId) ?? null;
}

function activeTrackEntityOf(
  data: AppData,
  tracks: readonly TrackWithGroups[],
): TrackWithGroups | null {
  const focusedId = focusedTrackIdOf(data);
  if (!focusedId) return null;
  return tracks.find((track) => track.id === focusedId) ?? null;
}

function focusedTrackIdOf(data: AppData): TrackId | null {
  if (data.activeTrackId) return data.activeTrackId;

  const legacyActiveFocus = (data.settings as unknown as {
    activeFocus?: { kind?: unknown; id?: unknown };
  }).activeFocus;

  if (legacyActiveFocus?.kind === "track" && typeof legacyActiveFocus.id === "string") {
    return legacyActiveFocus.id as TrackId;
  }

  return null;
}

function libraryRows(
  payload: AppData,
  tracks: readonly TrackWithGroups[],
  now = new Date(),
): LibraryProblemRow[] {
  const targetRetention = payload.settings.memoryReview.targetRetention;
  const slugs = new Set<string>(Object.keys(payload.problemsBySlug));
  for (const track of tracks) {
    for (const group of track.groups) {
      for (const membership of group.problems) {
        slugs.add(membership.problemSlug);
      }
    }
  }

  return Array.from(slugs)
    .map((slug): LibraryProblemRow => {
      const problem = payload.problemsBySlug[slug] ?? synthesizeProblem(slug);
      const studyState = payload.studyStatesBySlug[slug] ?? null;
      const suspendFlag = effectivelySuspendedFlag(
        problem,
        studyState,
        payload.settings,
      );
      return {
        view: buildProblemView(
          problem as unknown as Parameters<typeof buildProblemView>[0],
          payload.topicsById,
          payload.companiesById,
        ),
        studyState: buildStudyStateView({
          studyState: studyState as unknown as Parameters<
            typeof buildStudyStateView
          >[0]["studyState"],
          now,
          targetRetention,
        }),
        trackMemberships: trackMembershipsForSlug(tracks, slug),
        ...(suspendFlag.suspended ? { suspended: suspendFlag.reason } : {}),
      };
    })
    .sort((a, b) => a.view.title.localeCompare(b.view.title));
}

function synthesizeProblem(slug: string): Problem {
  return {
    slug,
    title: slugToTitle(slug),
    difficulty: "Unknown",
    isPremium: false,
    url: slugToUrl(slug),
    topicIds: [],
    companyIds: [],
    createdAt: "",
    updatedAt: "",
    studyState: null,
    topics: [],
    companies: [],
  };
}

function activeTrackCard(activeTrack: ActiveTrackView | null): TrackCardView | null {
  if (!activeTrack) return null;
  return {
    id: activeTrack.id,
    name: activeTrack.name,
    description: activeTrack.description,
    sourceSet: activeTrack.sourceSet,
    active: activeTrack.active,
    totalQuestions: activeTrack.totalQuestions,
    completedQuestions: activeTrack.completedQuestions,
    completionPercent: activeTrack.completionPercent,
    dueCount: activeTrack.dueCount,
    totalChapters: activeTrack.totalChapters,
    completedChapters: activeTrack.completedChapters,
    nextQuestionTitle: activeTrack.nextQuestionTitle,
    nextChapterTitle: activeTrack.nextChapterTitle,
  };
}

export function buildPopupShellPayload(
  data: AppData,
  tracks: readonly TrackWithGroups[],
  now = new Date(),
): PopupShellPayload {
  const queue = buildTodayQueue(data, now);
  const trackViews = buildTrackViews(data, tracks, now);
  const activeTrackView = activeTrackViewOf(data, trackViews);
  const activeTrackEntity = activeTrackEntityOf(data, tracks);
  const activeTrack = buildActiveTrackView({
    activeTrackId: focusedTrackIdOf(data),
    trackView: activeTrackView,
    trackEntity: activeTrackEntity,
    studyStatesBySlug: data.studyStatesBySlug as unknown as Parameters<
      typeof buildActiveTrackView
    >[0]["studyStatesBySlug"],
    problemsBySlug: data.problemsBySlug as unknown as Parameters<
      typeof buildActiveTrackView
    >[0]["problemsBySlug"],
    now,
  });
  const candidates = buildRecommendedCandidates(
    queue,
    activeTrack?.nextQuestion?.slug,
  );

  return {
    settings: data.settings,
    popup: {
      dueCount: queue.dueCount,
      streakDays: computeReviewStreakDays(data, now),
      recommended: candidates[0] ?? null,
      recommendedCandidates: candidates,
      trackNext: activeTrack?.nextQuestion ?? null,
      activeTrack: activeTrackCard(activeTrack),
    },
    activeTrack: activeTrack,
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
  const trackViews = buildTrackViews(data, tracks, now);

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
    library: libraryRows(data, tracks, now),
    tracks: trackViews,
    topicChoices,
    companyChoices,
  } as AppShellPayload;
}

export async function getQueue(): Promise<ReturnType<typeof buildTodayQueue>> {
  const data = await loadAppShellData();
  return buildTodayQueue(data);
}

export async function getActiveTrack(): Promise<TrackView | null> {
  const { db } = await getDb();
  const [data, rawTracks, session] = await Promise.all([
    loadAppShellData(),
    loadTracks(),
    getActiveTrackId(db),
  ]);
  if (!session) return null;
  const entity = rawTracks.find(t => t.id === session);
  if (!entity) return null;
  return buildTrackViews(data, [entity], new Date())[0] ?? null;
}

export async function getTracks(): Promise<{
  tracks: TrackView[];
  activeTrackId: TrackId | null;
  activeTrack: TrackView | null;
}> {
  const { db } = await getDb();
  const [data, rawTracks, session] = await Promise.all([
    loadAppShellData(),
    loadTracks(),
    getActiveTrackId(db),
  ]);
  const tracks = buildTrackViews(data, rawTracks, new Date());
  const activeTrackId = session;
  return {
    tracks,
    activeTrackId,
    activeTrack: tracks.find(t => t.id === activeTrackId) ?? null,
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
