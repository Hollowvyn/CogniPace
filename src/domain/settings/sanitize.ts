import type { ActiveFocus } from "../active-focus/model";
import { asSetGroupId, asStudySetId } from "../common/ids";
import { DEFAULT_COURSE_ID } from "../common/constants";

import {
  DifficultyGoalSettings,
  ReviewOrder,
  StudyMode,
  UserSettings,
} from "./model";
import { createInitialSetsEnabled, createInitialUserSettings } from "./seed";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberInRange(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

function nonNegativeInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : fallback;
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.round(value))
    : fallback;
}

function timeString(value: unknown, fallback: string): string {
  return typeof value === "string" && isTimeString(value)
    ? value
    : fallback;
}

function isTimeString(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function isReviewOrder(value: unknown): value is ReviewOrder {
  return (
    value === "dueFirst" ||
    value === "mixByDifficulty" ||
    value === "weakestFirst"
  );
}

function reviewOrder(value: unknown, fallback: ReviewOrder): ReviewOrder {
  return isReviewOrder(value) ? value : fallback;
}

function isStudyMode(value: unknown): value is StudyMode {
  return value === "studyPlan" || value === "freestyle";
}

function studyMode(value: unknown, fallback: StudyMode): StudyMode {
  return isStudyMode(value) ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function settingsRecord(value: unknown, fallback: object): UnknownRecord {
  return isRecord(value) ? value : (fallback as UnknownRecord);
}

function sanitizeActiveFocus(value: unknown): ActiveFocus | undefined {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  if (value.kind !== "studySet") return undefined;
  if (typeof value.id !== "string" || !value.id.trim()) return undefined;
  const focus: ActiveFocus = {
    kind: "studySet",
    id: asStudySetId(value.id),
  };
  if (typeof value.groupId === "string" && value.groupId.trim()) {
    focus.groupId = asSetGroupId(value.groupId);
  }
  return focus;
}

function sanitizeSetsEnabled(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) {
    return createInitialSetsEnabled();
  }

  return {
    ...createInitialSetsEnabled(),
    ...Object.fromEntries(
      Object.entries(value).filter(
        (entry): entry is [string, boolean] => typeof entry[1] === "boolean"
      )
    ),
  };
}

function sanitizeDifficultyGoalMs(
  value: unknown,
  fallback: DifficultyGoalSettings
): DifficultyGoalSettings {
  let base: DifficultyGoalSettings;
  if (!isRecord(value)) {
    base = { ...fallback };
  } else {
    base = {
      Easy: positiveInteger(value.Easy, fallback.Easy),
      Medium: positiveInteger(value.Medium, fallback.Medium),
      Hard: positiveInteger(value.Hard, fallback.Hard),
    };
  }

  const STEP_MS = 60000;
  base.Easy = Math.max(10 * STEP_MS, Math.min(base.Easy, 58 * STEP_MS));
  base.Medium = Math.max(base.Easy + STEP_MS, Math.min(base.Medium, 59 * STEP_MS));
  base.Hard = Math.max(base.Medium + STEP_MS, Math.min(base.Hard, 60 * STEP_MS));

  return base;
}

function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0
  );
}

function isPositiveInteger(value: unknown): value is number {
  return isNonNegativeInteger(value) && value > 0;
}

function isBooleanRecord(value: unknown): value is Record<string, boolean> {
  return (
    isRecord(value) &&
    Object.values(value).every((entry) => typeof entry === "boolean")
  );
}

function isDifficultyGoalSettings(value: unknown): value is DifficultyGoalSettings {
  return (
    isRecord(value) &&
    isPositiveInteger(value.Easy) &&
    isPositiveInteger(value.Medium) &&
    isPositiveInteger(value.Hard)
  );
}

export function hasGroupedUserSettings(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isRecord(value.notifications) &&
    isRecord(value.memoryReview) &&
    isRecord(value.questionFilters) &&
    isRecord(value.timing) &&
    isRecord(value.experimental)
  );
}

export function isPersistedUserSettings(value: unknown): value is UserSettings {
  if (!hasGroupedUserSettings(value)) {
    return false;
  }

  const source = value as UnknownRecord;
  const notifications = source.notifications as UnknownRecord;
  const memoryReview = source.memoryReview as UnknownRecord;
  const questionFilters = source.questionFilters as UnknownRecord;
  const timing = source.timing as UnknownRecord;
  const experimental = source.experimental as UnknownRecord;

  return (
    isNonNegativeInteger(source.dailyQuestionGoal) &&
    isStudyMode(source.studyMode) &&
    typeof source.activeCourseId === "string" &&
    Boolean(source.activeCourseId.trim()) &&
    isBooleanRecord(source.setsEnabled) &&
    typeof notifications.enabled === "boolean" &&
    typeof notifications.dailyTime === "string" &&
    isTimeString(notifications.dailyTime) &&
    typeof memoryReview.targetRetention === "number" &&
    Number.isFinite(memoryReview.targetRetention) &&
    memoryReview.targetRetention >= 0.7 &&
    memoryReview.targetRetention <= 0.95 &&
    isReviewOrder(memoryReview.reviewOrder) &&
    typeof questionFilters.skipIgnored === "boolean" &&
    typeof questionFilters.skipPremium === "boolean" &&
    typeof timing.requireSolveTime === "boolean" &&
    typeof timing.hardMode === "boolean" &&
    isDifficultyGoalSettings(timing.difficultyGoalMs) &&
    typeof experimental.autoDetectSolved === "boolean"
  );
}

export function sanitizeStoredUserSettings(value: unknown): UserSettings {
  const initial = createInitialUserSettings();
  const source = isRecord(value) ? value : {};

  const notifications = settingsRecord(
    source.notifications,
    initial.notifications
  );
  const memoryReview = settingsRecord(source.memoryReview, initial.memoryReview);
  const questionFilters = settingsRecord(
    source.questionFilters,
    initial.questionFilters
  );
  const timing = settingsRecord(source.timing, initial.timing);
  const experimental = settingsRecord(source.experimental, initial.experimental);

  const sanitizedRequireSolveTime = booleanValue(
    timing.requireSolveTime,
    initial.timing.requireSolveTime
  );

  const sanitizedActiveFocus = sanitizeActiveFocus(source.activeFocus);

  return {
    dailyQuestionGoal: nonNegativeInteger(
      source.dailyQuestionGoal,
      initial.dailyQuestionGoal
    ),
    studyMode: studyMode(source.studyMode, initial.studyMode),
    activeCourseId:
      typeof source.activeCourseId === "string" && source.activeCourseId.trim()
        ? source.activeCourseId
        : DEFAULT_COURSE_ID,
    setsEnabled: sanitizeSetsEnabled(source.setsEnabled),
    ...(sanitizedActiveFocus !== undefined
      ? { activeFocus: sanitizedActiveFocus }
      : {}),
    notifications: {
      enabled: booleanValue(
        notifications.enabled,
        initial.notifications.enabled
      ),
      dailyTime: timeString(
        notifications.dailyTime,
        initial.notifications.dailyTime
      ),
    },
    memoryReview: {
      targetRetention: numberInRange(
        memoryReview.targetRetention,
        initial.memoryReview.targetRetention,
        0.7,
        0.95
      ),
      reviewOrder: reviewOrder(
        memoryReview.reviewOrder,
        initial.memoryReview.reviewOrder
      ),
    },
    questionFilters: {
      skipIgnored: booleanValue(
        questionFilters.skipIgnored,
        initial.questionFilters.skipIgnored
      ),
      skipPremium: booleanValue(
        questionFilters.skipPremium,
        initial.questionFilters.skipPremium
      ),
    },
    timing: {
      requireSolveTime: sanitizedRequireSolveTime,
      hardMode: sanitizedRequireSolveTime && booleanValue(
        timing.hardMode,
        initial.timing.hardMode
      ),
      difficultyGoalMs: sanitizeDifficultyGoalMs(
        timing.difficultyGoalMs,
        initial.timing.difficultyGoalMs
      ),
    },
    experimental: {
      autoDetectSolved: booleanValue(
        experimental.autoDetectSolved,
        initial.experimental.autoDetectSolved
      ),
    },
  };
}
