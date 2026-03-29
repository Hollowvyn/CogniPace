import { summarizeAnalytics } from "./shared/analytics";
import {
  buildActiveCourseView,
  buildCourseCards,
  buildCourseOptions,
  ensureCourseData,
  ensureProblemInCourse,
  getCourseMemberships,
  markCourseQuestionLaunched,
  setActiveCourse,
  setActiveCourseChapter,
  syncCourseProgress,
} from "./shared/courses";
import { getCuratedSet } from "./shared/curatedSets";
import { buildTodayQueue } from "./shared/queue";
import { buildRecommendedCandidates } from "./shared/recommendations";
import {
  ensureProblem,
  ensureStudyState,
  importProblemsIntoSet,
  normalizeDifficulty,
  parseProblemInput,
} from "./shared/repository";
import { RuntimeResponse } from "./shared/runtime";
import { applyReview, resetSchedule } from "./shared/scheduler";
import { getAppData, mergeSettings, mutateAppData } from "./shared/storage";
import { getStudyStateSummary, normalizeStudyState } from "./shared/studyState";
import {
  AppShellPayload,
  ExportPayload,
  LibraryProblemRow,
  MessageType,
  RuntimeMessage,
  StudyState,
} from "./shared/types";
import {
  normalizeSlug,
  nowIso,
  slugToTitle,
  slugToUrl,
  uniqueStrings,
} from "./shared/utils";

function ok<T>(data: T): RuntimeResponse<T> {
  return { ok: true, data };
}

function fail(error: unknown): RuntimeResponse<never> {
  const message = error instanceof Error ? error.message : "Unknown error";
  return { ok: false, error: message };
}

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

async function getAppShellData(): Promise<RuntimeResponse<AppShellPayload>> {
  const data = await getAppData();
  const queue = buildTodayQueue(data);
  const analytics = summarizeAnalytics(data);
  const courses = buildCourseCards(data);
  const activeCourse = buildActiveCourseView(data);
  const candidates = buildRecommendedCandidates(
    queue,
    activeCourse?.nextQuestion?.slug
  );

  return ok({
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

async function openExtensionPage(payload: {
  path: string;
}): Promise<RuntimeResponse> {
  const path = typeof payload.path === "string" ? payload.path.trim() : "";
  if (!path) {
    throw new Error("Missing extension path.");
  }

  await chrome.tabs.create({ url: chrome.runtime.getURL(path) });
  return ok({ opened: true });
}

async function upsertFromPage(payload: {
  slug: string;
  title?: string;
  difficulty?: string;
  url?: string;
  topics?: string[];
}): Promise<RuntimeResponse> {
  const updated = await mutateAppData((data) => {
    const problem = ensureProblem(data, {
      slug: payload.slug,
      title: payload.title,
      difficulty: normalizeDifficulty(payload.difficulty),
      url: payload.url,
      topics: payload.topics,
    });

    const state = ensureStudyState(data, payload.slug);
    syncCourseProgress(data);

    return {
      ...data,
      problemsBySlug: {
        ...data.problemsBySlug,
        [problem.leetcodeSlug]: problem,
      },
      studyStatesBySlug: {
        ...data.studyStatesBySlug,
        [problem.leetcodeSlug]: state,
      },
    };
  });

  const slug = normalizeSlug(payload.slug);
  if (!slug) {
    throw new Error("Invalid slug.");
  }

  return ok({
    problem: updated.problemsBySlug[slug],
    studyState: updated.studyStatesBySlug[slug],
  });
}

async function getProblemContext(payload: {
  slug: string;
}): Promise<RuntimeResponse> {
  const data = await getAppData();
  const slug = normalizeSlug(payload.slug);
  if (!slug) {
    return ok({ problem: null, studyState: null });
  }

  return ok({
    problem: data.problemsBySlug[slug] ?? null,
    studyState: data.studyStatesBySlug[slug] ?? null,
  });
}

async function saveReviewResult(payload: {
  slug: string;
  rating: 0 | 1 | 2 | 3;
  solveTimeMs?: number;
  mode?: "RECALL" | "FULL_SOLVE";
  notes?: string;
  courseId?: string;
  chapterId?: string;
}): Promise<RuntimeResponse> {
  const normalized = normalizeSlug(payload.slug);
  if (!normalized) {
    throw new Error("Invalid slug.");
  }

  const now = nowIso();
  const updated = await mutateAppData((data) => {
    const problem = ensureProblem(data, { slug: normalized });
    const current = ensureStudyState(data, normalized);

    const nextState = applyReview({
      state: current,
      difficulty: problem.difficulty,
      rating: payload.rating,
      solveTimeMs: payload.solveTimeMs,
      mode: payload.mode,
      notesSnapshot: payload.notes ?? current.notes,
      settings: data.settings,
      now,
    });

    if (typeof payload.notes === "string") {
      nextState.notes = payload.notes;
    }

    data.studyStatesBySlug[problem.leetcodeSlug] = nextState;
    markCourseQuestionLaunched(
      data,
      normalized,
      now,
      payload.courseId,
      payload.chapterId
    );
    syncCourseProgress(data, now);
    return data;
  });

  const nextState = updated.studyStatesBySlug[normalized];
  const studyStateSummary = getStudyStateSummary(nextState);
  return ok({
    studyState: nextState,
    nextReviewAt: studyStateSummary.nextReviewAt,
    phase: studyStateSummary.phase,
    lastRating: nextState.lastRating,
  });
}

async function rateProblem(payload: {
  slug: string;
  rating: 0 | 1 | 2 | 3;
  solveTimeMs?: number;
  mode?: "RECALL" | "FULL_SOLVE";
  notesSnapshot?: string;
}): Promise<RuntimeResponse> {
  return saveReviewResult({
    slug: payload.slug,
    rating: payload.rating,
    solveTimeMs: payload.solveTimeMs,
    mode: payload.mode,
    notes: payload.notesSnapshot,
  });
}

async function updateNotes(payload: {
  slug: string;
  notes: string;
}): Promise<RuntimeResponse> {
  const normalized = normalizeSlug(payload.slug);
  if (!normalized) {
    throw new Error("Invalid slug.");
  }

  const updated = await mutateAppData((data) => {
    ensureProblem(data, { slug: normalized });
    const state = ensureStudyState(data, normalized);
    state.notes = payload.notes;
    data.studyStatesBySlug[normalized] = state;
    return data;
  });

  return ok({ studyState: updated.studyStatesBySlug[normalized] });
}

async function updateTags(payload: {
  slug: string;
  tags: string[];
}): Promise<RuntimeResponse> {
  const normalized = normalizeSlug(payload.slug);
  if (!normalized) {
    throw new Error("Invalid slug.");
  }

  const updated = await mutateAppData((data) => {
    ensureProblem(data, { slug: normalized });
    const state = ensureStudyState(data, normalized);
    state.tags = payload.tags.map((tag) => tag.trim()).filter(Boolean);
    data.studyStatesBySlug[normalized] = state;
    return data;
  });

  return ok({ studyState: updated.studyStatesBySlug[normalized] });
}

async function getQueue(): Promise<RuntimeResponse> {
  const data = await getAppData();
  return ok(buildTodayQueue(data));
}

async function importCurated(payload: {
  setName: string;
}): Promise<RuntimeResponse> {
  const setProblems = getCuratedSet(payload.setName);
  if (setProblems.length === 0) {
    throw new Error(`Unknown curated set: ${payload.setName}`);
  }

  let importResult = { added: 0, updated: 0 };
  await mutateAppData((data) => {
    importResult = importProblemsIntoSet(data, payload.setName, setProblems);
    data.settings = mergeSettings(data.settings, {
      setsEnabled: {
        ...data.settings.setsEnabled,
        [payload.setName]: true,
      },
    });
    syncCourseProgress(data);
    return data;
  });

  return ok({
    setName: payload.setName,
    count: setProblems.length,
    added: importResult.added,
    updated: importResult.updated,
  });
}

async function importCustom(payload: {
  setName?: string;
  items: Array<{
    slug: string;
    title?: string;
    difficulty?: "Easy" | "Medium" | "Hard" | "Unknown";
    tags?: string[];
  }>;
}): Promise<RuntimeResponse> {
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error("Custom set import requires at least one item.");
  }

  const normalizedName = payload.setName?.trim() || "Custom";
  let importResult = { added: 0, updated: 0 };

  await mutateAppData((data) => {
    importResult = importProblemsIntoSet(data, normalizedName, payload.items);
    data.settings = mergeSettings(data.settings, {
      setsEnabled: {
        ...data.settings.setsEnabled,
        [normalizedName]: true,
        Custom: true,
      },
    });
    syncCourseProgress(data);
    return data;
  });

  return ok({
    setName: normalizedName,
    count: payload.items.length,
    added: importResult.added,
    updated: importResult.updated,
  });
}

async function exportData(): Promise<RuntimeResponse<ExportPayload>> {
  const data = await getAppData();
  return ok({
    version: 3,
    problems: Object.values(data.problemsBySlug),
    studyStatesBySlug: data.studyStatesBySlug,
    settings: data.settings,
    coursesById: data.coursesById,
    courseOrder: data.courseOrder,
    courseProgressById: data.courseProgressById,
  });
}

async function importData(payload: ExportPayload): Promise<RuntimeResponse> {
  if (!Array.isArray(payload.problems)) {
    throw new Error("Invalid import format: problems must be an array.");
  }

  await mutateAppData((data) => {
    data.problemsBySlug = {};
    data.studyStatesBySlug = {};
    data.coursesById = payload.coursesById ?? {};
    data.courseOrder = payload.courseOrder ?? [];
    data.courseProgressById = payload.courseProgressById ?? {};

    for (const problem of payload.problems) {
      const slug = normalizeSlug(problem.leetcodeSlug);
      if (!slug) {
        continue;
      }

      const now = nowIso();
      data.problemsBySlug[slug] = {
        id: problem.id || slug,
        leetcodeSlug: slug,
        leetcodeId: problem.leetcodeId,
        title: problem.title?.trim() || slugToTitle(slug),
        difficulty: problem.difficulty ?? "Unknown",
        url: problem.url || slugToUrl(slug),
        topics: uniqueStrings(problem.topics ?? []),
        sourceSet: uniqueStrings(problem.sourceSet ?? []),
        createdAt: problem.createdAt || now,
        updatedAt: problem.updatedAt || now,
      };
    }

    for (const [slug, state] of Object.entries(
      payload.studyStatesBySlug ?? {}
    )) {
      data.studyStatesBySlug[slug.toLowerCase()] = normalizeStudyState(
        state as StudyState
      );
    }

    data.settings = mergeSettings(data.settings, payload.settings ?? {});
    ensureCourseData(data);
    syncCourseProgress(data);
    return data;
  });

  return ok({ imported: true });
}

async function updateSettings(
  payload: Record<string, unknown>
): Promise<RuntimeResponse> {
  const updated = await mutateAppData((data) => {
    data.settings = mergeSettings(data.settings, payload);
    ensureCourseData(data);
    syncCourseProgress(data);
    return data;
  });

  return ok({ settings: updated.settings });
}

async function addProblemByInput(payload: {
  input: string;
  sourceSet?: string;
  topics?: string[];
  markAsStarted?: boolean;
}): Promise<RuntimeResponse> {
  const parsed = parseProblemInput(payload.input);
  const updated = await mutateAppData((data) => {
    const problem = ensureProblem(data, {
      slug: parsed.slug,
      url: parsed.url,
      sourceSet: payload.sourceSet,
      topics: payload.topics,
    });
    const state = ensureStudyState(data, parsed.slug);
    syncCourseProgress(data);

    return {
      ...data,
      problemsBySlug: {
        ...data.problemsBySlug,
        [problem.leetcodeSlug]: problem,
      },
      studyStatesBySlug: {
        ...data.studyStatesBySlug,
        [problem.leetcodeSlug]: state,
      },
    };
  });

  return ok({
    slug: parsed.slug,
    problem: updated.problemsBySlug[parsed.slug],
    studyState: updated.studyStatesBySlug[parsed.slug],
  });
}

async function addProblemToCourse(payload: {
  courseId: string;
  chapterId: string;
  input: string;
  markAsStarted?: boolean;
}): Promise<RuntimeResponse> {
  const parsed = parseProblemInput(payload.input);
  const updated = await mutateAppData((data) => {
    const course = data.coursesById[payload.courseId];
    if (!course || !course.chaptersById[payload.chapterId]) {
      throw new Error("Course or chapter not found.");
    }

    const chapter = course.chaptersById[payload.chapterId];
    const problem = ensureProblem(data, {
      slug: parsed.slug,
      url: parsed.url,
      sourceSet: course.sourceSet,
      topics: [chapter.title],
    });
    ensureStudyState(data, parsed.slug);

    ensureProblemInCourse(course, payload.chapterId, problem);
    markCourseQuestionLaunched(
      data,
      problem.leetcodeSlug,
      nowIso(),
      payload.courseId,
      payload.chapterId
    );
    syncCourseProgress(data);
    return data;
  });

  const normalized = normalizeSlug(parsed.slug);
  if (!normalized) {
    throw new Error("Invalid slug.");
  }

  return ok({
    problem: updated.problemsBySlug[normalized],
    studyState: updated.studyStatesBySlug[normalized],
    course: buildActiveCourseView(updated, payload.courseId),
  });
}

async function switchActiveCourse(payload: {
  courseId: string;
}): Promise<RuntimeResponse> {
  const updated = await mutateAppData((data) => {
    setActiveCourse(data, payload.courseId);
    return data;
  });

  return ok({
    activeCourseId: updated.settings.activeCourseId,
    activeCourse: buildActiveCourseView(
      updated,
      updated.settings.activeCourseId
    ),
  });
}

async function activateCourseChapter(payload: {
  courseId: string;
  chapterId: string;
}): Promise<RuntimeResponse> {
  const updated = await mutateAppData((data) => {
    setActiveCourseChapter(data, payload.courseId, payload.chapterId);
    return data;
  });

  return ok({
    activeCourse: buildActiveCourseView(updated, payload.courseId),
  });
}

async function trackCourseQuestionLaunch(payload: {
  slug: string;
  courseId?: string;
  chapterId?: string;
}): Promise<RuntimeResponse> {
  const updated = await mutateAppData((data) => {
    markCourseQuestionLaunched(
      data,
      payload.slug,
      nowIso(),
      payload.courseId,
      payload.chapterId
    );
    return data;
  });

  return ok({
    tracked: true,
    activeCourse: buildActiveCourseView(
      updated,
      payload.courseId ?? updated.settings.activeCourseId
    ),
  });
}

async function suspendProblem(payload: {
  slug: string;
  suspend: boolean;
}): Promise<RuntimeResponse> {
  const normalized = normalizeSlug(payload.slug);
  if (!normalized) {
    throw new Error("Invalid slug.");
  }

  const updated = await mutateAppData((data) => {
    ensureProblem(data, { slug: normalized });
    const state = ensureStudyState(data, normalized);
    state.suspended = payload.suspend;
    data.studyStatesBySlug[normalized] = state;
    syncCourseProgress(data);
    return data;
  });

  return ok({ studyState: updated.studyStatesBySlug[normalized] });
}

async function resetProblem(payload: {
  slug: string;
  keepNotes?: boolean;
}): Promise<RuntimeResponse> {
  const normalized = normalizeSlug(payload.slug);
  if (!normalized) {
    throw new Error("Invalid slug.");
  }

  const updated = await mutateAppData((data) => {
    ensureProblem(data, { slug: normalized });
    const state = data.studyStatesBySlug[normalized];
    data.studyStatesBySlug[normalized] = resetSchedule(
      state,
      payload.keepNotes ?? true
    );
    syncCourseProgress(data);
    return data;
  });

  return ok({ studyState: updated.studyStatesBySlug[normalized] });
}

async function handleMessage(
  message: RuntimeMessage
): Promise<RuntimeResponse> {
  switch (message.type as MessageType) {
    case "UPSERT_PROBLEM_FROM_PAGE":
      return upsertFromPage(
        message.payload as Parameters<typeof upsertFromPage>[0]
      );
    case "GET_PROBLEM_CONTEXT":
      return getProblemContext(
        message.payload as Parameters<typeof getProblemContext>[0]
      );
    case "RATE_PROBLEM":
      return rateProblem(message.payload as Parameters<typeof rateProblem>[0]);
    case "SAVE_REVIEW_RESULT":
      return saveReviewResult(
        message.payload as Parameters<typeof saveReviewResult>[0]
      );
    case "OPEN_EXTENSION_PAGE":
      return openExtensionPage(
        message.payload as Parameters<typeof openExtensionPage>[0]
      );
    case "UPDATE_NOTES":
      return updateNotes(message.payload as Parameters<typeof updateNotes>[0]);
    case "UPDATE_TAGS":
      return updateTags(message.payload as Parameters<typeof updateTags>[0]);
    case "GET_TODAY_QUEUE":
      return getQueue();
    case "GET_DASHBOARD_DATA":
    case "GET_APP_SHELL_DATA":
      return getAppShellData();
    case "SWITCH_ACTIVE_COURSE":
      return switchActiveCourse(
        message.payload as Parameters<typeof switchActiveCourse>[0]
      );
    case "SET_ACTIVE_COURSE_CHAPTER":
      return activateCourseChapter(
        message.payload as Parameters<typeof activateCourseChapter>[0]
      );
    case "TRACK_COURSE_QUESTION_LAUNCH":
      return trackCourseQuestionLaunch(
        message.payload as Parameters<typeof trackCourseQuestionLaunch>[0]
      );
    case "IMPORT_CURATED_SET":
      return importCurated(
        message.payload as Parameters<typeof importCurated>[0]
      );
    case "IMPORT_CUSTOM_SET":
      return importCustom(
        message.payload as Parameters<typeof importCustom>[0]
      );
    case "EXPORT_DATA":
      return exportData();
    case "IMPORT_DATA":
      return importData(message.payload as ExportPayload);
    case "UPDATE_SETTINGS":
      return updateSettings(message.payload as Record<string, unknown>);
    case "ADD_PROBLEM_BY_INPUT":
      return addProblemByInput(
        message.payload as Parameters<typeof addProblemByInput>[0]
      );
    case "ADD_PROBLEM_TO_COURSE":
      return addProblemToCourse(
        message.payload as Parameters<typeof addProblemToCourse>[0]
      );
    case "SUSPEND_PROBLEM":
      return suspendProblem(
        message.payload as Parameters<typeof suspendProblem>[0]
      );
    case "RESET_PROBLEM_SCHEDULE":
      return resetProblem(
        message.payload as Parameters<typeof resetProblem>[0]
      );
    default:
      return fail(`Unknown message type: ${(message as RuntimeMessage).type}`);
  }
}

function inQuietHours(
  startHour: number,
  endHour: number,
  currentHour: number
): boolean {
  if (startHour === endHour) {
    return false;
  }

  if (startHour < endHour) {
    return currentHour >= startHour && currentHour < endHour;
  }

  return currentHour >= startHour || currentHour < endHour;
}

async function maybeNotifyDueQueue(): Promise<void> {
  const data = await getAppData();
  if (!data.settings.notifications) {
    return;
  }

  const now = new Date();
  const hour = now.getHours();
  if (
    inQuietHours(
      data.settings.quietHours.startHour,
      data.settings.quietHours.endHour,
      hour
    )
  ) {
    return;
  }

  const queue = buildTodayQueue(data, now);
  if (queue.dueCount <= 0) {
    return;
  }

  await chrome.notifications.create("leetcode-spaced-repetition-due", {
    type: "basic",
    iconUrl: "icons/icon-128.png",
    title: "LeetCode reviews due",
    message: `You have ${queue.dueCount} review${queue.dueCount === 1 ? "" : "s"} due today.`,
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  await mutateAppData((data) => {
    ensureCourseData(data);
    return data;
  });
  chrome.alarms.create("due-check", { periodInMinutes: 60 });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create("due-check", { periodInMinutes: 60 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "due-check") {
    void maybeNotifyDueQueue();
  }
});

chrome.runtime.onMessage.addListener(
  (message: RuntimeMessage, _sender, sendResponse) => {
    void handleMessage(message)
      .then((response) => sendResponse(response))
      .catch((error) => sendResponse(fail(error)));
    return true;
  }
);
