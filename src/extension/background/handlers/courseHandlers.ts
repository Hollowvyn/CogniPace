/** Background handlers for course, catalog, and queue-shaping mutations. */
import { getCuratedSet } from "../../../data/catalog/curatedSets";
import {
  mergeSettings,
  mutateAppData,
} from "../../../data/repositories/appDataRepository";
import {
  ensureProblem,
  ensureStudyState,
  importProblemsIntoSet,
  parseProblemInput,
} from "../../../data/repositories/problemRepository";
import { nowIso } from "../../../domain/common/time";
import {
  buildActiveCourseView,
  ensureProblemInCourse,
  markCourseQuestionLaunched,
  setActiveCourse,
  setActiveCourseChapter,
  syncCourseProgress,
} from "../../../domain/courses/courseProgress";
import { normalizeSlug } from "../../../domain/problem/slug";
import { ok } from "../responses";

/** Imports a built-in curated set into the local library. */
export async function importCurated(payload: { setName: string }) {
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

/** Imports a custom user-defined set into the local library. */
export async function importCustom(payload: {
  setName?: string;
  items: Array<{
    slug: string;
    title?: string;
    difficulty?: "Easy" | "Medium" | "Hard" | "Unknown";
    tags?: string[];
  }>;
}) {
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

/** Adds a problem directly into the library from a slug or URL. */
export async function addProblemByInput(payload: {
  input: string;
  sourceSet?: string;
  topics?: string[];
  markAsStarted?: boolean;
}) {
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

/** Adds a problem into a specific course chapter and updates course progress. */
export async function addProblemToCourse(payload: {
  courseId: string;
  chapterId: string;
  input: string;
  markAsStarted?: boolean;
}) {
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

/** Switches the active course in user settings. */
export async function switchActiveCourseHandler(payload: { courseId: string }) {
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

/** Sets the active chapter inside the selected course. */
export async function activateCourseChapter(payload: {
  courseId: string;
  chapterId: string;
}) {
  const updated = await mutateAppData((data) => {
    setActiveCourseChapter(data, payload.courseId, payload.chapterId);
    return data;
  });

  return ok({
    activeCourse: buildActiveCourseView(updated, payload.courseId),
  });
}

/** Tracks that a course question was launched from a popup or dashboard action. */
export async function trackCourseQuestionLaunch(payload: {
  slug: string;
  courseId?: string;
  chapterId?: string;
}) {
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
