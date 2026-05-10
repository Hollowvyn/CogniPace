/** Background handlers for app-shell reads and extension page navigation. */
import { getAppData } from "../../../data/repositories/appDataRepository";
import {
  computeReviewStreakDays,
  summarizeAnalytics,
} from "../../../domain/analytics/summarizeAnalytics";
import {
  buildActiveCourseView,
  buildCourseCards,
  buildCourseOptions,
  getCourseMemberships,
} from "../../../domain/courses/courseProgress";
import { slugToTitle, slugToUrl } from "../../../domain/problem/slug";
import { buildRecommendedCandidates } from "../../../domain/queue/buildRecommendedCandidates";
import { buildTodayQueue } from "../../../domain/queue/buildTodayQueue";
import { effectivelySuspendedFlag } from "../../../domain/queue/effectivelySuspended";
import {
  ActiveCourseView,
  AppShellPayload,
  CourseCardView,
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

import type { AppData, Problem } from "../../../domain/types";

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
function buildStudySetViews(data: AppData): StudySetView[] {
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
  studySetViews: readonly StudySetView[],
): StudySetView | null {
  const focusedId =
    data.settings.activeFocus?.kind === "studySet"
      ? data.settings.activeFocus.id
      : data.settings.activeCourseId;
  if (!focusedId) return null;
  return studySetViews.find((view) => view.id === focusedId) ?? null;
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
        courses: getCourseMemberships(payload, slug),
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

function activeCourseCard(
  activeCourse: ActiveCourseView | null
): CourseCardView | null {
  if (!activeCourse) {
    return null;
  }

  return {
    id: activeCourse.id,
    name: activeCourse.name,
    description: activeCourse.description,
    sourceSet: activeCourse.sourceSet,
    active: activeCourse.active,
    totalQuestions: activeCourse.totalQuestions,
    completedQuestions: activeCourse.completedQuestions,
    completionPercent: activeCourse.completionPercent,
    dueCount: activeCourse.dueCount,
    totalChapters: activeCourse.totalChapters,
    completedChapters: activeCourse.completedChapters,
    nextQuestionTitle: activeCourse.nextQuestionTitle,
    nextChapterTitle: activeCourse.nextChapterTitle,
  };
}

/** Builds the narrow popup payload without dashboard-only library or analytics data. */
export function buildPopupShellPayload(
  data: Awaited<ReturnType<typeof getAppData>>,
  now = new Date()
): PopupShellPayload {
  const queue = buildTodayQueue(data, now);
  const activeFocusId =
    data.settings.activeFocus?.kind === "studySet"
      ? data.settings.activeFocus.id
      : data.settings.activeCourseId;
  const activeCourse = buildActiveCourseView(data, activeFocusId, now);
  const candidates = buildRecommendedCandidates(
    queue,
    activeCourse?.nextQuestion?.slug
  );
  const studySetViews = buildStudySetViews(data);
  const activeStudySetView = buildActiveStudySetView(data, studySetViews);

  return {
    settings: data.settings,
    popup: {
      dueCount: queue.dueCount,
      streakDays: computeReviewStreakDays(data, now),
      recommended: candidates[0] ?? null,
      recommendedCandidates: candidates,
      courseNext: activeCourse?.nextQuestion ?? null,
      activeCourse: activeCourseCard(activeCourse),
    },
    activeCourse,
    activeStudySetView,
  };
}

/** Builds the popup-only app shell payload from the current persisted state. */
export async function getPopupShellData() {
  const data = await getAppData();
  return ok(buildPopupShellPayload(data));
}

/** Builds the popup/dashboard app shell payload from the current persisted state. */
export async function getAppShellData() {
  const data = await getAppData();
  const now = new Date();
  const popupShell = buildPopupShellPayload(data, now);
  const queue = buildTodayQueue(data, now);
  const analytics = summarizeAnalytics(data, now);
  const studySetViews = buildStudySetViews(data);

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
    courses: buildCourseCards(data),
    library: libraryRows(data, now),
    courseOptions: buildCourseOptions(data),
    studySetViews,
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
