/** Boundary parser for UserSettings — coerces arbitrary input into a
 *  valid snapshot. Used at storage-read, backup-import, and merge
 *  boundaries. Idempotent. */
import {
  createInitialUserSettings,
} from "./UserSettings";

import type { DifficultyGoalSettings } from "./DifficultyGoalSettings";
import type { ReviewOrder } from "./ReviewOrder";
import type { StudyMode } from "./StudyMode";
import type { UserSettings } from "./UserSettings";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberInRange(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
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

function isTimeString(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function timeString(value: unknown, fallback: string): string {
  return typeof value === "string" && isTimeString(value) ? value : fallback;
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

function sanitizeDifficultyGoalMs(
  value: unknown,
  fallback: DifficultyGoalSettings,
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
  base.Medium = Math.max(
    base.Easy + STEP_MS,
    Math.min(base.Medium, 59 * STEP_MS),
  );
  base.Hard = Math.max(
    base.Medium + STEP_MS,
    Math.min(base.Hard, 60 * STEP_MS),
  );

  return base;
}

/** Coerce an arbitrary value into a valid UserSettings, replacing any
 *  malformed fields with the canonical defaults. Idempotent: passing a
 *  sanitized result back through yields the same shape. */
export function sanitizeStoredUserSettings(value: unknown): UserSettings {
  const initial = createInitialUserSettings();
  const source = isRecord(value) ? value : {};

  const notifications = settingsRecord(
    source.notifications,
    initial.notifications,
  );
  const memoryReview = settingsRecord(source.memoryReview, initial.memoryReview);
  const questionFilters = settingsRecord(
    source.questionFilters,
    initial.questionFilters,
  );
  const timing = settingsRecord(source.timing, initial.timing);
  const experimental = settingsRecord(source.experimental, initial.experimental);

  const sanitizedRequireSolveTime = booleanValue(
    timing.requireSolveTime,
    initial.timing.requireSolveTime,
  );

  return {
    dailyQuestionGoal: nonNegativeInteger(
      source.dailyQuestionGoal,
      initial.dailyQuestionGoal,
    ),
    studyMode: studyMode(source.studyMode, initial.studyMode),
    notifications: {
      enabled: booleanValue(
        notifications.enabled,
        initial.notifications.enabled,
      ),
      dailyTime: timeString(
        notifications.dailyTime,
        initial.notifications.dailyTime,
      ),
    },
    memoryReview: {
      targetRetention: numberInRange(
        memoryReview.targetRetention,
        initial.memoryReview.targetRetention,
        0.7,
        0.95,
      ),
      reviewOrder: reviewOrder(
        memoryReview.reviewOrder,
        initial.memoryReview.reviewOrder,
      ),
    },
    questionFilters: {
      skipPremium: booleanValue(
        questionFilters.skipPremium,
        initial.questionFilters.skipPremium,
      ),
    },
    timing: {
      requireSolveTime: sanitizedRequireSolveTime,
      hardMode:
        sanitizedRequireSolveTime &&
        booleanValue(timing.hardMode, initial.timing.hardMode),
      difficultyGoalMs: sanitizeDifficultyGoalMs(
        timing.difficultyGoalMs,
        initial.timing.difficultyGoalMs,
      ),
    },
    experimental: {
      autoDetectSolved: booleanValue(
        experimental.autoDetectSolved,
        initial.experimental.autoDetectSolved,
      ),
    },
  };
}
