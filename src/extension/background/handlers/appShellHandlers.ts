/** Background handlers for app-shell reads and extension page navigation. */
import {
  computeReviewStreakDays,
  summarizeAnalytics,
} from "@features/analytics/server";
import {
  buildRecommendedCandidates,
  buildTodayQueue,
  effectivelySuspendedFlag,
} from "@features/queue/server";
import { getUserSettings } from "@features/settings/server";
import { listStudyStates } from "@features/study/server";
import { listTracks } from "@features/tracks/server";
import { validateExtensionPagePath } from "@libs/runtime-rpc/validator";
import { getDb } from "@platform/db/instance";

import { listCompanies } from "../../../data/companies/repository";
import { listProblems } from "../../../data/problems/repository";
import { getAppData } from "../../../data/repositories/appDataRepository";
import { listTopics } from "../../../data/topics/repository";
import { buildActiveTrackView } from "../../../domain/active-focus/buildActiveTrackView";
import { slugToTitle, slugToUrl } from "../../../domain/problem/slug";
import {
  ActiveTrackView,
  AppShellPayload,
  TrackCardView,
  LibraryProblemRow,
  PopupShellPayload,
  TrackMembership,
  TrackView,
} from "../../../domain/views";
import {
  buildProblemView,
  buildStudyStateView,
  buildTrackView,
} from "../../../domain/views/utils/hydrate";
import { ok } from "../responses";

import type { Company } from "../../../domain/companies/model";
import type { Topic } from "../../../domain/topics/model";
import type { AppData, Problem } from "../../../domain/types";
import type { TrackWithGroups } from "@features/tracks";

/**
 * Loads topics + companies + settings + problems + studyStates from
 * SQLite (Phase 4+5 SSoT) and mutates the legacy fields on `AppData` in
 * place so non-tracks helpers (libraryRows, queue builders) read the
 * same shape they always have. Tracks are NOT mirrored back into the
 * blob — every consumer now gets `TrackWithGroups[]` directly via
 * `loadTracks()` and view-builder calls take that explicit handle.
 */
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
  // Phase 5 problems: SQLite is the SSoT. Replace data.problemsBySlug
  // wholesale so downstream library/track-view code reads the same
  // shape it always has — just sourced from the DB now.
  const problemMap: Record<string, Problem> = {};
  for (const p of problems) problemMap[p.slug] = p;
  data.problemsBySlug = problemMap;
  // Phase 5 studyStates: SQLite SSoT. listStudyStates returns the full
  // map keyed by slug with attempts joined; the libraryRows/queue
  // builders consume `data.studyStatesBySlug` unchanged.
  data.studyStatesBySlug = studyStates;
}

/**
 * Loads every track (with groups + group-problem memberships) once
 * via the SQLite tracks repo. Single round trip per shell render —
 * the result is reused for both the dashboard's track list, the
 * "active track" hero, and the library's `trackMemberships` column.
 */
async function loadTracks(): Promise<TrackWithGroups[]> {
  const { db } = await getDb();
  return listTracks(db);
}

/** Walks the loaded tracks to answer "which tracks contain this slug?"
 * for the library row. Cheap because the slug set is small; if it ever
 * grows, replace with `listMembershipsForSlug` keyed per row. */
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

/** Hydrates every track for dashboard consumption. */
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

/** Returns the hydrated view for the currently focused track, or `null`. */
function activeTrackViewOf(
  data: AppData,
  trackViews: readonly TrackView[],
): TrackView | null {
  const focusedId =
    data.settings.activeFocus?.kind === "track"
      ? data.settings.activeFocus.id
      : null;
  if (!focusedId) return null;
  return trackViews.find((view) => view.id === focusedId) ?? null;
}

/** Returns the raw `TrackWithGroups` for the currently focused track,
 * or `null`. Drives the active-track view builder which needs slug
 * order + membership rows beyond what `TrackView` carries. */
function activeTrackEntityOf(
  data: AppData,
  tracks: readonly TrackWithGroups[],
): TrackWithGroups | null {
  const focusedId =
    data.settings.activeFocus?.kind === "track"
      ? data.settings.activeFocus.id
      : null;
  if (!focusedId) return null;
  return tracks.find((track) => track.id === focusedId) ?? null;
}

function libraryRows(
  payload: Awaited<ReturnType<typeof getAppData>>,
  tracks: readonly TrackWithGroups[],
  now = new Date()
): LibraryProblemRow[] {
  const targetRetention = payload.settings.memoryReview.targetRetention;
  // Union of every slug the user could care about: persisted problems
  // (anything they've ever opened or imported) + every curated track
  // slug (so the library is non-empty even pre-seed / post-wipe).
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

/** Minimal Problem placeholder when the user hasn't opened the page yet
 * but the slug shows up in a curated track. Replaced by the real entity
 * the moment the user visits LeetCode. */
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

function activeTrackCard(
  activeTrack: ActiveTrackView | null
): TrackCardView | null {
  if (!activeTrack) {
    return null;
  }

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

/** Builds the narrow popup payload without dashboard-only library or analytics data. */
export function buildPopupShellPayload(
  data: Awaited<ReturnType<typeof getAppData>>,
  tracks: readonly TrackWithGroups[],
  now = new Date()
): PopupShellPayload {
  const queue = buildTodayQueue(data, now);
  const trackViews = buildTrackViews(data, tracks, now);
  const activeTrackView = activeTrackViewOf(data, trackViews);
  const activeTrackEntity = activeTrackEntityOf(data, tracks);
  const activeTrack = buildActiveTrackView({
    activeFocus: data.settings.activeFocus,
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
    activeTrack?.nextQuestion?.slug
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

/** Builds the popup-only app shell payload from the current persisted state. */
export async function getPopupShellData() {
  const data = await getAppData();
  await hydrateRegistriesFromDb(data);
  const tracks = await loadTracks();
  return ok(buildPopupShellPayload(data, tracks));
}

/** Builds the popup/dashboard app shell payload from the current persisted state. */
export async function getAppShellData() {
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

  return ok<AppShellPayload>({
    ...popupShell,
    queue,
    analytics,
    recommendedCandidates: popupShell.popup.recommendedCandidates,
    library: libraryRows(data, tracks, now),
    tracks: trackViews,
    topicChoices,
    companyChoices,
  });
}

/** Returns the live due/new/reinforcement queue projection. */
export async function getQueue() {
  const data = await getAppData();
  return ok(buildTodayQueue(data));
}

/** Opens an internal extension page after validating the requested path. */
export async function openExtensionPage(payload: { path: string }) {
  const path = validateExtensionPagePath(payload.path);
  await chrome.tabs.create({ url: chrome.runtime.getURL(path) });
  return ok({ opened: true });
}
