import { CURRENT_STORAGE_SCHEMA_VERSION } from "./constants";
import {
  CourseChapter,
  CourseDefinition,
  CourseProgress,
  CourseQuestionProgress,
  CourseQuestionRef,
  CourseChapterProgress,
  ExportPayload,
  Problem,
  StudyState,
  UserSettings,
} from "./types";
import {
  normalizeSlug,
  nowIso,
  parseDifficulty,
  slugToTitle,
  slugToUrl,
  uniqueStrings,
} from "./utils";

const ALLOWED_IMPORT_KEYS = new Set([
  "version",
  "problems",
  "studyStatesBySlug",
  "settings",
  "coursesById",
  "courseOrder",
  "courseProgressById",
]);

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureAllowedKeys(payload: UnknownRecord): void {
  for (const key of Object.keys(payload)) {
    if (!ALLOWED_IMPORT_KEYS.has(key)) {
      throw new Error(`Invalid import format: unexpected field "${key}".`);
    }
  }
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function safeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function safeInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : fallback;
}

function safeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function safeBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function safeTimeString(value: unknown): string | undefined {
  return typeof value === "string" && /^([01]\d|2[0-3]):([0-5]\d)$/.test(value)
    ? value
    : undefined;
}

function sanitizeProblem(problem: unknown, importedAt: string): Problem | null {
  if (!isRecord(problem)) {
    return null;
  }

  const slug = normalizeSlug(
    typeof problem.leetcodeSlug === "string" ? problem.leetcodeSlug : ""
  );
  if (!slug) {
    return null;
  }

  return {
    id: typeof problem.id === "string" && problem.id.trim() ? problem.id : slug,
    leetcodeSlug: slug,
    leetcodeId:
      typeof problem.leetcodeId === "string" && problem.leetcodeId.trim()
        ? problem.leetcodeId
        : undefined,
    title:
      typeof problem.title === "string" && problem.title.trim()
        ? problem.title.trim()
        : slugToTitle(slug),
    difficulty: parseDifficulty(
      typeof problem.difficulty === "string" ? problem.difficulty : undefined
    ),
    url: slugToUrl(slug),
    topics: uniqueStrings(isStringArray(problem.topics) ? problem.topics : []),
    sourceSet: uniqueStrings(
      isStringArray(problem.sourceSet) ? problem.sourceSet : []
    ),
    createdAt:
      typeof problem.createdAt === "string" && problem.createdAt.trim()
        ? problem.createdAt
        : importedAt,
    updatedAt:
      typeof problem.updatedAt === "string" && problem.updatedAt.trim()
        ? problem.updatedAt
        : importedAt,
  };
}

function sanitizeStudyStatesBySlug(value: unknown): Record<string, StudyState> {
  if (!isRecord(value)) {
    return {};
  }

  const result: Record<string, StudyState> = {};
  for (const [slug, state] of Object.entries(value)) {
    const normalizedSlug = normalizeSlug(slug);
    if (!normalizedSlug || !isRecord(state)) {
      continue;
    }
    result[normalizedSlug] = state as unknown as StudyState;
  }
  return result;
}

function sanitizeSettings(
  value: unknown
): (Partial<UserSettings> & { activeStudyPlanId?: string }) | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const settings: Partial<UserSettings> & { activeStudyPlanId?: string } = {};
  const dailyQuestionGoal = safeNumber(value.dailyQuestionGoal);
  const dailyNewLimit = safeNumber(value.dailyNewLimit);
  const dailyReviewLimit = safeNumber(value.dailyReviewLimit);
  const targetRetention = safeNumber(value.targetRetention);

  if (dailyQuestionGoal !== undefined) {
    settings.dailyQuestionGoal = dailyQuestionGoal;
  }
  if (dailyNewLimit !== undefined) {
    settings.dailyNewLimit = dailyNewLimit;
  }
  if (dailyReviewLimit !== undefined) {
    settings.dailyReviewLimit = dailyReviewLimit;
  }
  if (targetRetention !== undefined) {
    settings.targetRetention = targetRetention;
  }
  if (
    value.reviewOrder === "dueFirst" ||
    value.reviewOrder === "mixByDifficulty" ||
    value.reviewOrder === "weakestFirst"
  ) {
    settings.reviewOrder = value.reviewOrder;
  }
  if (value.studyMode === "studyPlan" || value.studyMode === "freestyle") {
    settings.studyMode = value.studyMode;
  }
  settings.activeCourseId = safeOptionalString(value.activeCourseId);
  settings.activeStudyPlanId = safeOptionalString(value.activeStudyPlanId);

  const requireSolveTime = safeBoolean(value.requireSolveTime);
  const autoDetectSolved = safeBoolean(value.autoDetectSolved);
  const notifications = safeBoolean(value.notifications);
  const skipIgnoredQuestions = safeBoolean(value.skipIgnoredQuestions);
  const skipPremiumQuestions = safeBoolean(value.skipPremiumQuestions);
  const notificationTime = safeTimeString(value.notificationTime);

  if (requireSolveTime !== undefined) {
    settings.requireSolveTime = requireSolveTime;
  }
  if (autoDetectSolved !== undefined) {
    settings.autoDetectSolved = autoDetectSolved;
  }
  if (notifications !== undefined) {
    settings.notifications = notifications;
  }
  if (skipIgnoredQuestions !== undefined) {
    settings.skipIgnoredQuestions = skipIgnoredQuestions;
  }
  if (skipPremiumQuestions !== undefined) {
    settings.skipPremiumQuestions = skipPremiumQuestions;
  }
  if (notificationTime !== undefined) {
    settings.notificationTime = notificationTime;
  }

  if (isRecord(value.difficultyGoalMs)) {
    settings.difficultyGoalMs = {
      Easy: safeNumber(value.difficultyGoalMs.Easy) ?? 20 * 60 * 1000,
      Medium: safeNumber(value.difficultyGoalMs.Medium) ?? 35 * 60 * 1000,
      Hard: safeNumber(value.difficultyGoalMs.Hard) ?? 50 * 60 * 1000,
    };
  }

  if (isRecord(value.quietHours)) {
    settings.quietHours = {
      startHour: safeInteger(value.quietHours.startHour, 22),
      endHour: safeInteger(value.quietHours.endHour, 8),
    };
  }

  if (isRecord(value.setsEnabled)) {
    settings.setsEnabled = Object.fromEntries(
      Object.entries(value.setsEnabled).filter(
        (entry): entry is [string, boolean] => typeof entry[1] === "boolean"
      )
    );
  }

  return settings;
}

function sanitizeCourseChapter(
  chapterIdValue: string,
  chapter: unknown,
  fallbackOrder: number
): CourseChapter | null {
  if (!isRecord(chapter)) {
    return null;
  }

  const normalizedQuestionSlugs = uniqueStrings(
    (isStringArray(chapter.questionSlugs) ? chapter.questionSlugs : [])
      .map((slug) => normalizeSlug(slug))
      .filter(Boolean)
  );

  return {
    id: chapterIdValue,
    title: safeString(chapter.title, "Chapter"),
    order: safeInteger(chapter.order, fallbackOrder),
    questionSlugs: normalizedQuestionSlugs,
  };
}

function sanitizeCourseQuestionRef(
  slugKey: string,
  ref: unknown
): CourseQuestionRef | null {
  if (!isRecord(ref)) {
    return null;
  }

  const slug = normalizeSlug(typeof ref.slug === "string" ? ref.slug : slugKey);
  if (!slug) {
    return null;
  }

  return {
    slug,
    title: safeString(ref.title, slugToTitle(slug)),
    url: slugToUrl(slug),
    difficulty: parseDifficulty(
      typeof ref.difficulty === "string" ? ref.difficulty : undefined
    ),
    chapterId: safeString(ref.chapterId, ""),
    chapterTitle: safeString(ref.chapterTitle, ""),
    order: safeInteger(ref.order, 0),
  };
}

function sanitizeCoursesById(
  value: unknown,
  importedAt: string
): Record<string, CourseDefinition> {
  if (!isRecord(value)) {
    return {};
  }

  const result: Record<string, CourseDefinition> = {};

  for (const [courseIdValue, rawCourse] of Object.entries(value)) {
    if (!isRecord(rawCourse)) {
      continue;
    }

    const rawChapterIds = isStringArray(rawCourse.chapterIds)
      ? rawCourse.chapterIds.map((id) => id.trim()).filter(Boolean)
      : [];
    const rawChaptersById = isRecord(rawCourse.chaptersById)
      ? rawCourse.chaptersById
      : null;
    const rawRefsBySlug = isRecord(rawCourse.questionRefsBySlug)
      ? rawCourse.questionRefsBySlug
      : null;

    if (!rawChaptersById || !rawRefsBySlug) {
      continue;
    }

    const chaptersById: Record<string, CourseChapter> = {};
    const chapterIds: string[] = [];

    rawChapterIds.forEach((chapterIdValue, index) => {
      const sanitizedChapter = sanitizeCourseChapter(
        chapterIdValue,
        rawChaptersById[chapterIdValue],
        index
      );
      if (!sanitizedChapter) {
        return;
      }
      chaptersById[chapterIdValue] = sanitizedChapter;
      chapterIds.push(chapterIdValue);
    });

    if (chapterIds.length === 0) {
      continue;
    }

    const questionRefsBySlug: Record<string, CourseQuestionRef> = {};
    for (const [slugKey, ref] of Object.entries(rawRefsBySlug)) {
      const sanitizedRef = sanitizeCourseQuestionRef(slugKey, ref);
      if (!sanitizedRef) {
        continue;
      }
      questionRefsBySlug[sanitizedRef.slug] = sanitizedRef;
    }

    result[courseIdValue] = {
      id: safeString(rawCourse.id, courseIdValue),
      name: safeString(rawCourse.name, courseIdValue),
      description: safeString(rawCourse.description, ""),
      sourceSet: safeString(rawCourse.sourceSet, "Custom"),
      chapterIds,
      chaptersById,
      questionRefsBySlug,
      createdAt: safeString(rawCourse.createdAt, importedAt),
      updatedAt: safeString(rawCourse.updatedAt, importedAt),
    };
  }

  return result;
}

function sanitizeQuestionProgress(
  slugKey: string,
  value: unknown
): CourseQuestionProgress | null {
  if (!isRecord(value)) {
    return null;
  }

  const slug = normalizeSlug(
    typeof value.slug === "string" ? value.slug : slugKey
  );
  if (!slug) {
    return null;
  }

  return {
    slug,
    addedToLibraryAt: safeOptionalString(value.addedToLibraryAt),
    lastOpenedAt: safeOptionalString(value.lastOpenedAt),
    lastReviewedAt: safeOptionalString(value.lastReviewedAt),
    completedAt: safeOptionalString(value.completedAt),
  };
}

function sanitizeChapterProgress(
  chapterIdValue: string,
  value: unknown
): CourseChapterProgress | null {
  if (!isRecord(value) || !isRecord(value.questionProgressBySlug)) {
    return null;
  }

  const questionProgressBySlug: Record<string, CourseQuestionProgress> = {};
  for (const [slugKey, progress] of Object.entries(
    value.questionProgressBySlug
  )) {
    const sanitized = sanitizeQuestionProgress(slugKey, progress);
    if (!sanitized) {
      continue;
    }
    questionProgressBySlug[sanitized.slug] = sanitized;
  }

  return {
    chapterId: chapterIdValue,
    currentQuestionSlug: safeOptionalString(value.currentQuestionSlug),
    completedAt: safeOptionalString(value.completedAt),
    questionProgressBySlug,
  };
}

function sanitizeCourseProgressById(
  value: unknown,
  importedAt: string
): Record<string, CourseProgress> {
  if (!isRecord(value)) {
    return {};
  }

  const result: Record<string, CourseProgress> = {};

  for (const [courseIdValue, rawProgress] of Object.entries(value)) {
    if (!isRecord(rawProgress) || !isRecord(rawProgress.chapterProgressById)) {
      continue;
    }

    const chapterProgressById: Record<string, CourseChapterProgress> = {};
    for (const [chapterIdValue, chapterProgress] of Object.entries(
      rawProgress.chapterProgressById
    )) {
      const sanitizedChapterProgress = sanitizeChapterProgress(
        chapterIdValue,
        chapterProgress
      );
      if (!sanitizedChapterProgress) {
        continue;
      }
      chapterProgressById[chapterIdValue] = sanitizedChapterProgress;
    }

    result[courseIdValue] = {
      courseId: safeString(rawProgress.courseId, courseIdValue),
      activeChapterId: safeString(rawProgress.activeChapterId, ""),
      startedAt: safeString(rawProgress.startedAt, importedAt),
      lastInteractedAt: safeString(rawProgress.lastInteractedAt, importedAt),
      chapterProgressById,
    };
  }

  return result;
}

export function assertImportPayloadShape(
  payload: unknown
): asserts payload is ExportPayload {
  if (!isRecord(payload)) {
    throw new Error("Invalid import format: expected an object payload.");
  }

  ensureAllowedKeys(payload);

  if (!Array.isArray(payload.problems)) {
    throw new Error("Invalid import format: problems must be an array.");
  }

  if (
    "version" in payload &&
    payload.version !== undefined &&
    (typeof payload.version !== "number" || !Number.isInteger(payload.version))
  ) {
    throw new Error("Invalid import format: version must be an integer.");
  }

  if (
    "studyStatesBySlug" in payload &&
    payload.studyStatesBySlug !== undefined &&
    !isRecord(payload.studyStatesBySlug)
  ) {
    throw new Error(
      "Invalid import format: studyStatesBySlug must be an object."
    );
  }

  if (
    "settings" in payload &&
    payload.settings !== undefined &&
    !isRecord(payload.settings)
  ) {
    throw new Error("Invalid import format: settings must be an object.");
  }

  if (
    "coursesById" in payload &&
    payload.coursesById !== undefined &&
    !isRecord(payload.coursesById)
  ) {
    throw new Error("Invalid import format: coursesById must be an object.");
  }

  if (
    "courseOrder" in payload &&
    payload.courseOrder !== undefined &&
    !isStringArray(payload.courseOrder)
  ) {
    throw new Error(
      "Invalid import format: courseOrder must be a string array."
    );
  }

  if (
    "courseProgressById" in payload &&
    payload.courseProgressById !== undefined &&
    !isRecord(payload.courseProgressById)
  ) {
    throw new Error(
      "Invalid import format: courseProgressById must be an object."
    );
  }
}

export function sanitizeImportPayload(payload: ExportPayload): ExportPayload {
  assertImportPayloadShape(payload);

  if (payload.version !== undefined) {
    if (payload.version > CURRENT_STORAGE_SCHEMA_VERSION) {
      throw new Error(
        `Unsupported backup version: ${payload.version}. Current version is ${CURRENT_STORAGE_SCHEMA_VERSION}.`
      );
    }
  }

  const importedAt = nowIso();
  const problems = payload.problems
    .map((problem) => sanitizeProblem(problem, importedAt))
    .filter((problem): problem is Problem => problem !== null);
  const coursesById = sanitizeCoursesById(payload.coursesById, importedAt);

  return {
    version:
      payload.version === undefined
        ? undefined
        : CURRENT_STORAGE_SCHEMA_VERSION,
    problems,
    studyStatesBySlug: sanitizeStudyStatesBySlug(payload.studyStatesBySlug),
    settings: sanitizeSettings(payload.settings),
    coursesById,
    courseOrder: uniqueStrings(
      (Array.isArray(payload.courseOrder) ? payload.courseOrder : [])
        .map((courseId) => courseId.trim())
        .filter(Boolean)
    ),
    courseProgressById: sanitizeCourseProgressById(
      payload.courseProgressById,
      importedAt
    ),
  };
}
