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
import { createInitialUserSettings, getUserSettings } from "@features/settings/server";
import { listStudyStates } from "@features/study/server";
import { buildActiveTrackView, listTracks } from "@features/tracks/server";
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
import type {
  ActiveTrackView,
  TrackCardView,
  TrackMembership,
  TrackView,
  TrackWithGroups,
} from "@features/tracks";

/**
 * Reads every aggregate (problems, study states, topics, companies,
 * settings) from SQLite and assembles the legacy `AppData` shape that
 * the downstream view-builders still consume. The v7 chrome.storage
 * blob is retired — this is the only path into SQLite for app-shell
 * reads.
 */
async function loadAppShellData(): Promise<AppData> {
  const { db } = await getDb();
  const [topics, companies, settings, problems, studyStates] = await Promise.all([
    listTopics(db),
    listCompanies(db),
    getUserSettings(db),
    listProblems(db),
    listStudyStates(db),
  ]);
  const topicsById: Record<string, Topic> = {};
  for (const topic of topics) topicsById[topic.id] = topic;
  const companiesById: Record<string, Company> = {};
  for (const company of companies) companiesById[company.id] = company;
  const problemsBySlug: Record<string, Problem> = {};
  for (const problem of problems) problemsBySlug[problem.slug] = problem;
  return {
    problemsBySlug,
    studyStatesBySlug: studyStates,
    topicsById,
    companiesById,
    settings: settings ?? createInitialUserSettings(),
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
    leetcodeSlug: slug,
    slug,
    title: slugToTitle(slug),
    difficulty: "Unknown",
    isPremium: false,
    url: slugToUrl(slug),
    topics: [],
    topicIds: [],
    companyIds: [],
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
  data: AppData,
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

export async function openExtensionPage(
  payload: { path: string },
): Promise<{ opened: true }> {
  const path = validateExtensionPagePath(payload.path);
  await openTab(extensionUrl(path));
  return { opened: true as const };
}
