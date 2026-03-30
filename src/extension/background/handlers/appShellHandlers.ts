/** Background handlers for app-shell reads and extension page navigation. */
import { getAppData } from "../../../data/repositories/appDataRepository";
import { summarizeAnalytics } from "../../../domain/analytics/summarizeAnalytics";
import {
  buildActiveCourseView,
  buildCourseCards,
  buildCourseOptions,
  getCourseMemberships,
} from "../../../domain/courses/courseProgress";
import { getStudyStateSummary } from "../../../domain/fsrs/studyState";
import { buildRecommendedCandidates } from "../../../domain/queue/buildRecommendedCandidates";
import { buildTodayQueue } from "../../../domain/queue/buildTodayQueue";
import { AppShellPayload, LibraryProblemRow } from "../../../domain/views";
import { validateExtensionPagePath } from "../../runtime/validator";
import { ok } from "../responses";

function libraryRows(
  payload: Awaited<ReturnType<typeof getAppData>>
): LibraryProblemRow[] {
  return Object.values(payload.problemsBySlug)
    .map((problem) => ({
      problem,
      studyState: payload.studyStatesBySlug[problem.leetcodeSlug] ?? null,
      studyStateSummary: payload.studyStatesBySlug[problem.leetcodeSlug]
        ? getStudyStateSummary(payload.studyStatesBySlug[problem.leetcodeSlug])
        : null,
      courses: getCourseMemberships(payload, problem.leetcodeSlug),
    }))
    .sort((a, b) => a.problem.title.localeCompare(b.problem.title));
}

/** Builds the popup/dashboard app shell payload from the current persisted state. */
export async function getAppShellData() {
  const data = await getAppData();
  const queue = buildTodayQueue(data);
  const analytics = summarizeAnalytics(data);
  const courses = buildCourseCards(data);
  const activeCourse = buildActiveCourseView(data);
  const candidates = buildRecommendedCandidates(
    queue,
    activeCourse?.nextQuestion?.slug
  );

  return ok<AppShellPayload>({
    queue,
    analytics,
    settings: data.settings,
    popup: {
      dueCount: queue.dueCount,
      streakDays: analytics.streakDays,
      recommended: candidates[0] ?? null,
      recommendedCandidates: candidates,
      courseNext: activeCourse?.nextQuestion ?? null,
      activeCourse:
        courses.find((course) => course.id === data.settings.activeCourseId) ??
        null,
    },
    recommendedCandidates: candidates,
    courses,
    activeCourse,
    library: libraryRows(data),
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
