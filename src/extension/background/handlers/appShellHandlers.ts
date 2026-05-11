/** Background handlers for app-shell reads and extension page navigation. */
import { listCompanies } from "../../../data/companies/repository";
import { getDb } from "../../../data/db/instance";
import { getAppData } from "../../../data/repositories/appDataRepository";
import { getUserSettings } from "../../../data/settings/repository";
import { listTopics } from "../../../data/topics/repository";
import { buildActiveTrackView } from "../../../domain/active-focus/buildActiveTrackView";
import {
  computeReviewStreakDays,
  summarizeAnalytics,
} from "../../../domain/analytics/summarizeAnalytics";
import { slugToTitle, slugToUrl } from "../../../domain/problem/slug";
import { buildRecommendedCandidates } from "../../../domain/queue/buildRecommendedCandidates";
import { buildTodayQueue } from "../../../domain/queue/buildTodayQueue";
import { effectivelySuspendedFlag } from "../../../domain/queue/effectivelySuspended";
import {
  ActiveTrackView,
  AppShellPayload,
  TrackCardView,
  LibraryProblemRow,
  PopupShellPayload,
  StudySetView,
  TrackMembership,
} from "../../../domain/views";
import {
  buildProblemView,
  buildStudySetView,
  buildStudyStateView,
} from "../../../domain/views/hydrate";
import { validateExtensionPagePath } from "../../runtime/validator";
import { ok } from "../responses";

import type { Company } from "../../../domain/companies/model";
import type { Topic } from "../../../domain/topics/model";
import type { AppData, Problem } from "../../../domain/types";

/**
 * Loads topics + companies + settings from SQLite (Phase 4+5 SSoT) and
 * mutates `data.topicsById` / `data.companiesById` / `data.settings`
 * in place so downstream helpers — buildStudySetView, buildProblemView,
 * libraryRows, buildPopupShellPayload, etc. — read unchanged shapes.
 */
async function hydrateRegistriesFromDb(data: AppData): Promise<void> {
  const { db } = await getDb();
  const topics = await listTopics(db);
  const companies = await listCompanies(db);
  const settings = await getUserSettings(db);
  const topicMap: Record<string, Topic> = {};
  for (const t of topics) topicMap[t.id] = t;
  data.topicsById = topicMap;
  const companyMap: Record<string, Company> = {};
  for (const c of companies) companyMap[c.id] = c;
  data.companiesById = companyMap;
  if (settings) data.settings = settings;
}

/** Hydrates the v7 list of explicit StudySet memberships for a problem slug.
 * Derived sets (kind: company/topic/difficulty) aren't included here — they
 * carry no explicit slug list, so membership is defined by their filter and
 * resolved live by the consumer. */
function getTrackMemberships(data: AppData, slug: string): TrackMembership[] {
  const out: TrackMembership[] = [];
  for (const studySet of Object.values(data.studySetsById)) {
    for (const group of studySet.groups) {
      if ((group.problemSlugs as readonly string[]).includes(slug)) {
        out.push({
          trackId: studySet.id,
          trackName: studySet.name,
          groupId: group.id,
          groupName: group.nameOverride,
        });
        break;
      }
    }
  }
  return out;
}

/** Hydrates every StudySet for dashboard consumption. */
function buildStudySetViews(data: AppData, now: Date): StudySetView[] {
  const order = data.studySetOrder.length > 0
    ? data.studySetOrder
    : (Object.keys(data.studySetsById) as typeof data.studySetOrder);
  const views: StudySetView[] = [];
  for (const id of order) {
    const studySet = data.studySetsById[id];
    if (!studySet) continue;
    const progress = data.studySetProgressById[id] ?? null;
    views.push(
      buildStudySetView({
        studySet,
        // v6/v7 transitional Problem is structurally compatible with the
        // v7 Problem the hydrate helper expects.
        problemsBySlug:
          data.problemsBySlug as unknown as Parameters<
            typeof buildStudySetView
          >[0]["problemsBySlug"],
        topicsById: data.topicsById,
        companiesById: data.companiesById,
        progress,
        studyStatesBySlug: data.studyStatesBySlug as unknown as Parameters<
          typeof buildStudySetView
        >[0]["studyStatesBySlug"],
        now,
      }),
    );
  }
  return views;
}

/**
 * Returns the active StudySet view based on `settings.activeFocus`. Falls
 * back to the v6 active course (looked up by id in `studySetsById`) so the
 * v6→v7 transition keeps a meaningful "active" reference even before the
 * user explicitly chooses one in the new UI.
 */
function buildActiveStudySetView(
  data: AppData,
  tracks: readonly StudySetView[],
): StudySetView | null {
  const focusedId =
    data.settings.activeFocus?.kind === "track"
      ? data.settings.activeFocus.id
      : null;
  if (!focusedId) return null;
  return tracks.find((view) => view.id === focusedId) ?? null;
}

function libraryRows(
  payload: Awaited<ReturnType<typeof getAppData>>,
  now = new Date()
): LibraryProblemRow[] {
  const targetRetention = payload.settings.memoryReview.targetRetention;
  // Union of every slug the user could care about: persisted problems
  // (anything they've ever opened or imported) + every curated track
  // slug (so the library is non-empty even pre-seed / post-wipe).
  const slugs = new Set<string>(Object.keys(payload.problemsBySlug));
  for (const studySet of Object.values(payload.studySetsById)) {
    for (const group of studySet.groups) {
      for (const slug of group.problemSlugs) slugs.add(slug as string);
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
        trackMemberships: getTrackMemberships(payload, slug),
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
  now = new Date()
): PopupShellPayload {
  const queue = buildTodayQueue(data, now);
  const activeFocusId =
    data.settings.activeFocus?.kind === "track"
      ? data.settings.activeFocus.id
      : null;
  const tracks = buildStudySetViews(data, now);
  const activeTrackView = buildActiveStudySetView(data, tracks);
  const activeTrackEntity = activeFocusId
    ? (data.studySetsById[activeFocusId] ?? null)
    : null;
  const activeTrackProgress = activeFocusId
    ? (data.studySetProgressById[activeFocusId] ?? null)
    : null;
  const activeTrack = buildActiveTrackView({
    activeFocus: data.settings.activeFocus,
    trackView: activeTrackView,
    trackEntity: activeTrackEntity,
    trackProgress: activeTrackProgress,
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
  return ok(buildPopupShellPayload(data));
}

/** Builds the popup/dashboard app shell payload from the current persisted state. */
export async function getAppShellData() {
  const data = await getAppData();
  await hydrateRegistriesFromDb(data);
  const now = new Date();
  const popupShell = buildPopupShellPayload(data, now);
  const queue = buildTodayQueue(data, now);
  const analytics = summarizeAnalytics(data, now);
  const tracks = buildStudySetViews(data, now);

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
    library: libraryRows(data, now),
    tracks,
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
