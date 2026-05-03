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
import { getStudyStateSummary } from "../../../domain/fsrs/studyState";
import { buildRecommendedCandidates } from "../../../domain/queue/buildRecommendedCandidates";
import { buildTodayQueue } from "../../../domain/queue/buildTodayQueue";
import {
  ActiveCourseView,
  AppShellPayload,
  CourseCardView,
  LibraryProblemRow,
  PopupShellPayload,
} from "../../../domain/views";
import { validateExtensionPagePath } from "../../runtime/validator";
import { ok } from "../responses";

function libraryRows(
  payload: Awaited<ReturnType<typeof getAppData>>,
  now = new Date()
): LibraryProblemRow[] {
  const targetRetention = payload.settings.memoryReview.targetRetention;
  return Object.values(payload.problemsBySlug)
    .map((problem) => ({
      problem,
      studyState: payload.studyStatesBySlug[problem.leetcodeSlug] ?? null,
      studyStateSummary: payload.studyStatesBySlug[problem.leetcodeSlug]
        ? getStudyStateSummary(
            payload.studyStatesBySlug[problem.leetcodeSlug],
            now,
            targetRetention
          )
        : null,
      courses: getCourseMemberships(payload, problem.leetcodeSlug),
    }))
    .sort((a, b) => a.problem.title.localeCompare(b.problem.title));
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
  const activeCourse = buildActiveCourseView(data, data.settings.activeCourseId, now);
  const candidates = buildRecommendedCandidates(
    queue,
    activeCourse?.nextQuestion?.slug
  );

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

  return ok<AppShellPayload>({
    ...popupShell,
    queue,
    analytics,
    recommendedCandidates: popupShell.popup.recommendedCandidates,
    courses: buildCourseCards(data),
    library: libraryRows(data, now),
    courseOptions: buildCourseOptions(data),
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
