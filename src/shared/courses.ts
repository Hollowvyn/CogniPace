import { DEFAULT_COURSE_ID } from "./constants";
import { getDefaultCurriculumSteps, listStudyPlans } from "./curatedSets";
import { getLastReviewedAt, getStudyStateSummary } from "./studyState";
import {
  ActiveCourseView,
  AppData,
  CourseCardView,
  CourseChapter,
  CourseChapterProgress,
  CourseChapterView,
  CourseDefinition,
  CourseOption,
  CourseProgress,
  CourseQuestionProgress,
  CourseQuestionStatusView,
  CourseQuestionView,
  LibraryCourseReference,
  Problem,
  StudyState,
} from "./types";
import {
  normalizeSlug,
  nowIso,
  slugToTitle,
  slugToUrl,
  uniqueStrings,
} from "./utils";

function slugifySegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function chapterId(courseId: string, order: number, title: string): string {
  return `${courseId}::${String(order + 1).padStart(2, "0")}::${slugifySegment(title)}`;
}

function createQuestionProgress(slug: string): CourseQuestionProgress {
  return { slug };
}

function createChapterProgress(chapter: CourseChapter): CourseChapterProgress {
  const questionProgressBySlug: Record<string, CourseQuestionProgress> = {};

  for (const slug of chapter.questionSlugs) {
    questionProgressBySlug[slug] = createQuestionProgress(slug);
  }

  return {
    chapterId: chapter.id,
    currentQuestionSlug: chapter.questionSlugs[0],
    questionProgressBySlug,
  };
}

function createCourseProgress(
  course: CourseDefinition,
  now: string
): CourseProgress {
  const chapterProgressById: Record<string, CourseChapterProgress> = {};
  for (const chapterIdValue of course.chapterIds) {
    chapterProgressById[chapterIdValue] = createChapterProgress(
      course.chaptersById[chapterIdValue]
    );
  }

  return {
    courseId: course.id,
    activeChapterId: course.chapterIds[0] ?? "",
    startedAt: now,
    lastInteractedAt: now,
    chapterProgressById,
  };
}

function buildCuratedCourseDefinition(
  summary: ReturnType<typeof listStudyPlans>[number],
  now: string
): CourseDefinition {
  const steps = getDefaultCurriculumSteps(summary.id);
  const chapterIds: string[] = [];
  const chaptersById: Record<string, CourseChapter> = {};
  const questionRefsBySlug: CourseDefinition["questionRefsBySlug"] = {};
  const grouped = new Map<string, string[]>();

  for (const step of steps) {
    const current = grouped.get(step.topic) ?? [];
    current.push(step.slug);
    grouped.set(step.topic, current);

    questionRefsBySlug[step.slug] = {
      slug: step.slug,
      title: step.title,
      url: step.url,
      difficulty: step.difficulty,
      chapterId: "",
      chapterTitle: step.topic,
      order: current.length - 1,
    };
  }

  Array.from(grouped.entries()).forEach(([title, questionSlugs], order) => {
    const id = chapterId(summary.id, order, title);
    chapterIds.push(id);
    chaptersById[id] = {
      id,
      title,
      order,
      questionSlugs,
    };

    questionSlugs.forEach((slug, index) => {
      questionRefsBySlug[slug] = {
        ...questionRefsBySlug[slug],
        chapterId: id,
        chapterTitle: title,
        order: index,
      };
    });
  });

  return {
    id: summary.id,
    name: summary.name,
    description: summary.description,
    sourceSet: summary.sourceSet,
    chapterIds,
    chaptersById,
    questionRefsBySlug,
    createdAt: now,
    updatedAt: now,
  };
}

function buildCuratedSeed(now: string): {
  coursesById: Record<string, CourseDefinition>;
  courseOrder: string[];
} {
  const coursesById: Record<string, CourseDefinition> = {};
  const courseOrder: string[] = [];

  for (const summary of listStudyPlans()) {
    const course = buildCuratedCourseDefinition(summary, now);
    coursesById[course.id] = course;
    courseOrder.push(course.id);
  }

  return { coursesById, courseOrder };
}

function mergeCourseDefinition(
  curated: CourseDefinition,
  existing: CourseDefinition | undefined,
  now: string
): CourseDefinition {
  if (!existing) {
    return curated;
  }

  const mergedChapterIds = [...curated.chapterIds];
  const mergedChaptersById: Record<string, CourseChapter> = {};
  const mergedQuestionRefsBySlug = { ...curated.questionRefsBySlug };

  for (const chapterIdValue of curated.chapterIds) {
    const curatedChapter = curated.chaptersById[chapterIdValue];
    const existingChapter = existing.chaptersById[chapterIdValue];
    const questionSlugs = existingChapter
      ? uniqueStrings([
          ...curatedChapter.questionSlugs,
          ...existingChapter.questionSlugs,
        ])
      : curatedChapter.questionSlugs;

    mergedChaptersById[chapterIdValue] = {
      ...curatedChapter,
      questionSlugs,
    };
  }

  for (const chapterIdValue of existing.chapterIds) {
    if (mergedChaptersById[chapterIdValue]) {
      continue;
    }
    mergedChapterIds.push(chapterIdValue);
    mergedChaptersById[chapterIdValue] = existing.chaptersById[chapterIdValue];
  }

  for (const [slug, ref] of Object.entries(existing.questionRefsBySlug)) {
    if (mergedQuestionRefsBySlug[slug]) {
      continue;
    }
    mergedQuestionRefsBySlug[slug] = ref;
  }

  return {
    ...curated,
    chapterIds: mergedChapterIds,
    chaptersById: mergedChaptersById,
    questionRefsBySlug: mergedQuestionRefsBySlug,
    createdAt: existing.createdAt || curated.createdAt,
    updatedAt: now,
  };
}

function isStarted(state?: StudyState | null): boolean {
  return getStudyStateSummary(state).isStarted;
}

function isDue(state?: StudyState | null): boolean {
  return getStudyStateSummary(state).isDue;
}

function firstIncompleteChapterId(
  data: AppData,
  course: CourseDefinition
): string | null {
  for (const chapterIdValue of course.chapterIds) {
    const chapter = course.chaptersById[chapterIdValue];
    const complete = chapter.questionSlugs.every((slug) =>
      isStarted(data.studyStatesBySlug[slug])
    );
    if (!complete) {
      return chapterIdValue;
    }
  }
  return course.chapterIds[course.chapterIds.length - 1] ?? null;
}

function findCurrentQuestionSlug(
  data: AppData,
  chapter: CourseChapter
): string | null {
  const current = chapter.questionSlugs.find(
    (slug) => !isStarted(data.studyStatesBySlug[slug])
  );
  return current ?? null;
}

function courseQuestionStatus(
  data: AppData,
  chapter: CourseChapter,
  slug: string,
  chapterStatus: CourseChapterView["status"]
): CourseQuestionStatusView {
  const state = data.studyStatesBySlug[slug];
  const inLibrary = Boolean(data.problemsBySlug[slug]);
  const currentSlug = findCurrentQuestionSlug(data, chapter);

  if (isDue(state)) {
    return "DUE_NOW";
  }

  if (isStarted(state)) {
    return "QUEUED";
  }

  if (chapterStatus === "UPCOMING") {
    return "LOCKED";
  }

  if (currentSlug === slug) {
    return inLibrary ? "READY" : "CURRENT";
  }

  return "LOCKED";
}

function libraryReference(
  course: CourseDefinition,
  slug: string
): LibraryCourseReference | null {
  const ref = course.questionRefsBySlug[slug];
  if (!ref) {
    return null;
  }

  return {
    courseId: course.id,
    courseName: course.name,
    chapterId: ref.chapterId,
    chapterTitle: ref.chapterTitle,
  };
}

export function ensureCourseData(data: AppData, now = nowIso()): void {
  const curated = buildCuratedSeed(now);
  const mergedCoursesById: Record<string, CourseDefinition> = {};

  for (const courseIdValue of curated.courseOrder) {
    mergedCoursesById[courseIdValue] = mergeCourseDefinition(
      curated.coursesById[courseIdValue],
      data.coursesById[courseIdValue],
      now
    );
  }

  for (const [courseIdValue, course] of Object.entries(data.coursesById)) {
    if (mergedCoursesById[courseIdValue]) {
      continue;
    }
    mergedCoursesById[courseIdValue] = course;
  }

  data.coursesById = mergedCoursesById;
  data.courseOrder = uniqueStrings([
    ...curated.courseOrder,
    ...data.courseOrder,
  ]);

  for (const courseIdValue of data.courseOrder) {
    const course = data.coursesById[courseIdValue];
    if (!course) {
      continue;
    }

    const existing =
      data.courseProgressById[courseIdValue] ??
      createCourseProgress(course, now);
    for (const chapterIdValue of course.chapterIds) {
      const chapter = course.chaptersById[chapterIdValue];
      const chapterProgress =
        existing.chapterProgressById[chapterIdValue] ??
        createChapterProgress(chapter);

      for (const slug of chapter.questionSlugs) {
        chapterProgress.questionProgressBySlug[slug] =
          chapterProgress.questionProgressBySlug[slug] ??
          createQuestionProgress(slug);
      }

      existing.chapterProgressById[chapterIdValue] = chapterProgress;
    }

    data.courseProgressById[courseIdValue] = existing;
  }

  if (
    !data.settings.activeCourseId ||
    !data.coursesById[data.settings.activeCourseId]
  ) {
    data.settings.activeCourseId = data.courseOrder[0] ?? DEFAULT_COURSE_ID;
  }

  syncCourseProgress(data, now);
}

export function syncCourseProgress(data: AppData, now = nowIso()): void {
  for (const courseIdValue of data.courseOrder) {
    const course = data.coursesById[courseIdValue];
    if (!course) {
      continue;
    }

    const progress =
      data.courseProgressById[courseIdValue] ??
      createCourseProgress(course, now);
    const firstIncomplete = firstIncompleteChapterId(data, course);

    for (const chapterIdValue of course.chapterIds) {
      const chapter = course.chaptersById[chapterIdValue];
      const chapterProgress =
        progress.chapterProgressById[chapterIdValue] ??
        createChapterProgress(chapter);
      const currentQuestionSlug = findCurrentQuestionSlug(data, chapter);

      chapterProgress.currentQuestionSlug =
        currentQuestionSlug ??
        chapter.questionSlugs[chapter.questionSlugs.length - 1];

      let chapterComplete = true;
      for (const slug of chapter.questionSlugs) {
        const questionProgress =
          chapterProgress.questionProgressBySlug[slug] ??
          createQuestionProgress(slug);
        const state = data.studyStatesBySlug[slug];
        const problem = data.problemsBySlug[slug];

        if (problem && !questionProgress.addedToLibraryAt) {
          questionProgress.addedToLibraryAt = problem.createdAt || now;
        }

        const lastReviewedAt = getLastReviewedAt(state);
        if (lastReviewedAt) {
          questionProgress.lastReviewedAt = lastReviewedAt;
        }

        if (isStarted(state)) {
          questionProgress.completedAt =
            questionProgress.completedAt ?? lastReviewedAt ?? now;
        } else {
          chapterComplete = false;
          delete questionProgress.completedAt;
        }

        chapterProgress.questionProgressBySlug[slug] = questionProgress;
      }

      if (chapterComplete) {
        chapterProgress.completedAt = chapterProgress.completedAt ?? now;
      } else {
        delete chapterProgress.completedAt;
      }

      progress.chapterProgressById[chapterIdValue] = chapterProgress;
    }

    progress.activeChapterId =
      firstIncomplete ?? course.chapterIds[0] ?? progress.activeChapterId;
    progress.lastInteractedAt = progress.lastInteractedAt || now;
    progress.startedAt = progress.startedAt || now;
    data.courseProgressById[courseIdValue] = progress;
  }
}

export function setActiveCourse(
  data: AppData,
  courseId: string,
  now = nowIso()
): void {
  if (!data.coursesById[courseId]) {
    return;
  }

  data.settings.activeCourseId = courseId;
  const progress = data.courseProgressById[courseId];
  if (progress) {
    progress.lastInteractedAt = now;
  }
}

export function setActiveCourseChapter(
  data: AppData,
  courseId: string,
  chapterIdValue: string,
  now = nowIso()
): void {
  const course = data.coursesById[courseId];
  if (!course || !course.chaptersById[chapterIdValue]) {
    return;
  }

  const progress =
    data.courseProgressById[courseId] ?? createCourseProgress(course, now);
  progress.activeChapterId = chapterIdValue;
  progress.lastInteractedAt = now;
  data.courseProgressById[courseId] = progress;
}

export function markCourseQuestionLaunched(
  data: AppData,
  slug: string,
  now = nowIso(),
  courseId?: string,
  chapterIdValue?: string
): void {
  const normalized = normalizeSlug(slug);
  if (!normalized) {
    return;
  }

  for (const currentCourseId of data.courseOrder) {
    if (courseId && currentCourseId !== courseId) {
      continue;
    }
    const course = data.coursesById[currentCourseId];
    const ref = course?.questionRefsBySlug[normalized];
    if (!course || !ref) {
      continue;
    }
    if (chapterIdValue && ref.chapterId !== chapterIdValue) {
      continue;
    }

    const progress = data.courseProgressById[currentCourseId];
    const chapterProgress = progress?.chapterProgressById[ref.chapterId];
    const questionProgress =
      chapterProgress?.questionProgressBySlug[normalized];
    if (!progress || !chapterProgress || !questionProgress) {
      continue;
    }

    questionProgress.lastOpenedAt = now;
    if (data.problemsBySlug[normalized] && !questionProgress.addedToLibraryAt) {
      questionProgress.addedToLibraryAt =
        data.problemsBySlug[normalized].createdAt || now;
    }
    progress.lastInteractedAt = now;
  }
}

export function ensureProblemInCourse(
  course: CourseDefinition,
  chapterIdValue: string,
  problem: Problem,
  now = nowIso()
): void {
  const normalized = normalizeSlug(problem.leetcodeSlug);
  if (!normalized || !course.chaptersById[chapterIdValue]) {
    return;
  }

  const chapter = course.chaptersById[chapterIdValue];
  if (!chapter.questionSlugs.includes(normalized)) {
    chapter.questionSlugs = [...chapter.questionSlugs, normalized];
  }

  course.questionRefsBySlug[normalized] = {
    slug: normalized,
    title: problem.title || slugToTitle(normalized),
    url: problem.url || slugToUrl(normalized),
    difficulty: problem.difficulty,
    chapterId: chapterIdValue,
    chapterTitle: chapter.title,
    order: chapter.questionSlugs.indexOf(normalized),
  };
  course.updatedAt = now;
}

export function buildCourseCards(data: AppData): CourseCardView[] {
  const cards: CourseCardView[] = [];

  for (const courseIdValue of data.courseOrder) {
    const course = data.coursesById[courseIdValue];
    if (!course) {
      continue;
    }

    let totalQuestions = 0;
    let completedQuestions = 0;
    let dueCount = 0;
    let completedChapters = 0;
    let nextQuestionTitle: string | undefined;
    let nextChapterTitle: string | undefined;

    for (const chapterIdValue of course.chapterIds) {
      const chapter = course.chaptersById[chapterIdValue];
      const chapterComplete = chapter.questionSlugs.every((slug) =>
        isStarted(data.studyStatesBySlug[slug])
      );
      if (chapterComplete) {
        completedChapters += 1;
      }

      for (const slug of chapter.questionSlugs) {
        totalQuestions += 1;
        if (isStarted(data.studyStatesBySlug[slug])) {
          completedQuestions += 1;
        } else if (!nextQuestionTitle) {
          nextQuestionTitle =
            course.questionRefsBySlug[slug]?.title ?? slugToTitle(slug);
          nextChapterTitle = chapter.title;
        }

        if (isDue(data.studyStatesBySlug[slug])) {
          dueCount += 1;
        }
      }
    }

    cards.push({
      id: course.id,
      name: course.name,
      description: course.description,
      sourceSet: course.sourceSet,
      active: data.settings.activeCourseId === course.id,
      totalQuestions,
      completedQuestions,
      completionPercent:
        totalQuestions === 0
          ? 0
          : Math.round((completedQuestions / totalQuestions) * 100),
      dueCount,
      totalChapters: course.chapterIds.length,
      completedChapters,
      nextQuestionTitle,
      nextChapterTitle,
    });
  }

  return cards;
}

export function buildActiveCourseView(
  data: AppData,
  courseId = data.settings.activeCourseId
): ActiveCourseView | null {
  const course = data.coursesById[courseId];
  if (!course) {
    return null;
  }

  const card = buildCourseCards(data).find((entry) => entry.id === courseId);
  const firstIncomplete = firstIncompleteChapterId(data, course);
  const activeChapterIdValue = firstIncomplete ?? course.chapterIds[0] ?? null;
  const activeChapterTitle = activeChapterIdValue
    ? (course.chaptersById[activeChapterIdValue]?.title ?? null)
    : null;

  let nextQuestion: CourseQuestionView | null = null;
  const chapters: CourseChapterView[] = course.chapterIds.map(
    (chapterIdValue) => {
      const chapter = course.chaptersById[chapterIdValue];
      const completedQuestions = chapter.questionSlugs.filter((slug) =>
        isStarted(data.studyStatesBySlug[slug])
      ).length;
      const status: CourseChapterView["status"] =
        completedQuestions === chapter.questionSlugs.length
          ? "COMPLETE"
          : chapterIdValue === activeChapterIdValue
            ? "CURRENT"
            : "UPCOMING";

      const questions = chapter.questionSlugs.map((slug) => {
        const problem = data.problemsBySlug[slug];
        const ref = course.questionRefsBySlug[slug];
        const state = data.studyStatesBySlug[slug];
        const studyStateSummary = getStudyStateSummary(state);
        const questionStatus = courseQuestionStatus(
          data,
          chapter,
          slug,
          status
        );
        const view: CourseQuestionView = {
          slug,
          title: ref?.title || problem?.title || slugToTitle(slug),
          url: problem?.url || ref?.url || slugToUrl(slug),
          difficulty: problem?.difficulty || ref?.difficulty || "Unknown",
          chapterId: chapterIdValue,
          chapterTitle: chapter.title,
          status: questionStatus,
          reviewPhase: studyStateSummary.phase,
          nextReviewAt: studyStateSummary.nextReviewAt,
          inLibrary: Boolean(problem),
          isCurrent: questionStatus === "CURRENT" || questionStatus === "READY",
        };

        if (!nextQuestion && view.isCurrent) {
          nextQuestion = view;
        }

        return view;
      });

      return {
        id: chapterIdValue,
        title: chapter.title,
        order: chapter.order,
        status,
        totalQuestions: chapter.questionSlugs.length,
        completedQuestions,
        questions,
      };
    }
  );

  return {
    ...(card ?? {
      id: course.id,
      name: course.name,
      description: course.description,
      sourceSet: course.sourceSet,
      active: true,
      totalQuestions: 0,
      completedQuestions: 0,
      completionPercent: 0,
      dueCount: 0,
      totalChapters: course.chapterIds.length,
      completedChapters: 0,
    }),
    activeChapterId: activeChapterIdValue,
    activeChapterTitle,
    nextQuestion,
    chapters,
  };
}

export function buildCourseOptions(data: AppData): CourseOption[] {
  return data.courseOrder
    .map((courseIdValue) => {
      const course = data.coursesById[courseIdValue];
      if (!course) {
        return null;
      }

      return {
        id: course.id,
        name: course.name,
        chapterOptions: course.chapterIds.map((chapterIdValue) => ({
          id: chapterIdValue,
          title: course.chaptersById[chapterIdValue]?.title ?? "Chapter",
        })),
      } satisfies CourseOption;
    })
    .filter((option): option is CourseOption => Boolean(option));
}

export function getCourseMemberships(
  data: AppData,
  slug: string
): LibraryCourseReference[] {
  const normalized = normalizeSlug(slug);
  if (!normalized) {
    return [];
  }

  const memberships: LibraryCourseReference[] = [];
  for (const courseIdValue of data.courseOrder) {
    const course = data.coursesById[courseIdValue];
    if (!course) {
      continue;
    }

    const ref = libraryReference(course, normalized);
    if (ref) {
      memberships.push(ref);
    }
  }

  return memberships;
}
