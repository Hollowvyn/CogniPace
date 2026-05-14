/** Service-worker handlers for app-shell reads and extension page navigation. */
import {
  computeReviewStreakDays,
  summarizeAnalytics,
} from "@features/analytics/server";
import { slugToTitle, slugToUrl } from "@features/problems";
import {
  listCompanies,
  listProblems,
  listTopics,
} from "@features/problems/server";
import {
  buildRecommendedCandidates,
  buildTodayQueue,
  effectivelySuspendedFlag,
} from "@features/queue/server";
import { getUserSettings } from "@features/settings/server";
import { listStudyStates } from "@features/study/server";
import { buildActiveTrackView, listTracks } from "@features/tracks/server";
import { validateExtensionPagePath } from "@libs/runtime-rpc/url";
import { getDb } from "@platform/db/instance";

import { getAppData } from "../../../data/repositories/appDataRepository";
import {
  buildProblemView,
  buildStudyStateView,
  buildTrackView,
} from "../domain/policy/hydrate";

import type { AppData } from "../../../domain/types/AppData";
import type { AppShellPayload, PopupShellPayload } from "../domain/model";
import type {
  Company,
  LibraryProblemRow,
  Problem,
  Topic,
} from "@features/problems";
import type {
  ActiveTrackView,
  TrackCardView,
  TrackMembership,
  TrackView,
  TrackWithGroups,
} from "@features/tracks";

async function hydrateRegistriesFromDb(data: AppData): Promise<void> {
  const { db } = await getDb();
  const topics = await listTopics(db);
  const companies = await listCompanies(db);
  const settings = await getUserSettings(db);
  const problems = await listProblems(db);
  const studyStates = await listStudyStates(db);
  const topicMap: Record<string, Topic> = {};
  for (const t of topics) topicMap[t.id] = t;
  data.topicsById = topicMap;
  const companyMap: Record<string, Company> = {};
  for (const c of companies) companyMap[c.id] = c;
  data.companiesById = companyMap;
  if (settings) data.settings = settings;
  const problemMap: Record<string, Problem> = {};
  for (const p of problems) problemMap[p.slug] = p;
  data.problemsBySlug = problemMap;
  data.studyStatesBySlug = studyStates;
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
  const focusedId = data.settings.activeTrackId;
  if (!focusedId) return null;
  return trackViews.find((view) => view.id === focusedId) ?? null;
}

function activeTrackEntityOf(
  data: AppData,
  tracks: readonly TrackWithGroups[],
): TrackWithGroups | null {
  const focusedId = data.settings.activeTrackId;
  if (!focusedId) return null;
  return tracks.find((track) => track.id === focusedId) ?? null;
}

function libraryRows(
  payload: Awaited<ReturnType<typeof getAppData>>,
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
        problem,
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
    .sort((a, b) => a.problem.title.localeCompare(b.problem.title));
}

function synthesizeProblem(slug: string): Problem {
  return {
    id: slug,
    leetcodeSlug: slug,
    slug,
    title: slugToTitle(slug),
    difficulty: "Unknown",
    isPremium: false,
    url: slugToUrl(slug),
    topics: [],
    topicIds: [],
    companyIds: [],
    sourceSet: [],
    createdAt: "",
    updatedAt: "",
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
  data: Awaited<ReturnType<typeof getAppData>>,
  tracks: readonly TrackWithGroups[],
  now = new Date(),
): PopupShellPayload {
  const queue = buildTodayQueue(data, now);
  const trackViews = buildTrackViews(data, tracks, now);
  const activeTrackView = activeTrackViewOf(data, trackViews);
  const activeTrackEntity = activeTrackEntityOf(data, tracks);
  const activeTrack = buildActiveTrackView({
    activeTrackId: data.settings.activeTrackId,
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
  const data = await getAppData();
  await hydrateRegistriesFromDb(data);
  const tracks = await loadTracks();
  return buildPopupShellPayload(data, tracks);
}

export async function getAppShellData(): Promise<AppShellPayload> {
  const data = await getAppData();
  await hydrateRegistriesFromDb(data);
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
  const data = await getAppData();
  return buildTodayQueue(data);
}

export async function openExtensionPage(
  payload: { path: string },
): Promise<{ opened: true }> {
  const path = validateExtensionPagePath(payload.path);
  await chrome.tabs.create({ url: chrome.runtime.getURL(path) });
  return { opened: true as const };
}
