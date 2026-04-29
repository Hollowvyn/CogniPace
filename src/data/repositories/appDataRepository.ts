/** Repository for persisted app data stored in `chrome.storage.local`. */
import {
  BUILT_IN_SETS,
  CURRENT_STORAGE_SCHEMA_VERSION,
  DEFAULT_COURSE_ID,
  DEFAULT_SETTINGS,
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
} from "../../domain/common/constants";
import { ensureCourseData } from "../../domain/courses/courseProgress";
import { normalizeStudyState } from "../../domain/fsrs/studyState";
import { AppData, UserSettings } from "../../domain/types";
import {
  readLocalStorage,
  removeLocalStorage,
  writeLocalStorage,
} from "../datasources/chrome/storage";

export type LegacySettingsPatch = Partial<UserSettings> & {
  activeStudyPlanId?: string;
  scheduleIntensity?: "chill" | "normal" | "aggressive";
  slowSolveDowngradeEnabled?: boolean;
  slowSolveThresholdMs?: number;
};

export type StoredAppData = Partial<AppData> & {
  settings?: LegacySettingsPatch;
  schemaVersion?: number;
};

function normalizeSettings(input?: LegacySettingsPatch): UserSettings {
  const nextActiveCourseId =
    input?.activeCourseId || input?.activeStudyPlanId || DEFAULT_COURSE_ID;
  const legacyDailyGoal =
    typeof input?.dailyNewLimit === "number" &&
    Number.isFinite(input.dailyNewLimit) &&
    typeof input?.dailyReviewLimit === "number" &&
    Number.isFinite(input.dailyReviewLimit)
      ? Math.max(0, Math.round(input.dailyNewLimit + input.dailyReviewLimit))
      : DEFAULT_SETTINGS.dailyQuestionGoal;
  const merged: UserSettings = {
    ...DEFAULT_SETTINGS,
    ...(input ?? {}),
    dailyQuestionGoal:
      typeof input?.dailyQuestionGoal === "number" &&
      Number.isFinite(input.dailyQuestionGoal)
        ? Math.max(0, Math.round(input.dailyQuestionGoal))
        : legacyDailyGoal,
    activeCourseId: nextActiveCourseId,
    difficultyGoalMs: {
      ...DEFAULT_SETTINGS.difficultyGoalMs,
      ...(input?.difficultyGoalMs ?? {}),
    },
    quietHours: {
      ...DEFAULT_SETTINGS.quietHours,
      ...(input?.quietHours ?? {}),
    },
    setsEnabled: {
      ...DEFAULT_SETTINGS.setsEnabled,
      ...(input?.setsEnabled ?? {}),
    },
  };
  const normalizedNotificationTime = normalizeNotificationTime(
    merged.notificationTime
  );

  if (merged.studyMode !== "freestyle" && merged.studyMode !== "studyPlan") {
    merged.studyMode = DEFAULT_SETTINGS.studyMode;
  }

  merged.dailyQuestionGoal = normalizeNonNegativeInteger(
    merged.dailyQuestionGoal,
    DEFAULT_SETTINGS.dailyQuestionGoal
  );
  merged.dailyNewLimit = normalizeNonNegativeInteger(
    merged.dailyNewLimit,
    DEFAULT_SETTINGS.dailyNewLimit
  );
  merged.dailyReviewLimit = normalizeNonNegativeInteger(
    merged.dailyReviewLimit,
    DEFAULT_SETTINGS.dailyReviewLimit
  );
  merged.targetRetention = normalizeNumberInRange(
    merged.targetRetention,
    DEFAULT_SETTINGS.targetRetention,
    0.7,
    0.95
  );
  merged.notificationTime =
    normalizedNotificationTime ?? DEFAULT_SETTINGS.notificationTime;
  merged.autoDetectSolved = false;

  merged.difficultyGoalMs = {
    Easy: normalizePositiveInteger(
      merged.difficultyGoalMs.Easy,
      DEFAULT_SETTINGS.difficultyGoalMs.Easy
    ),
    Medium: normalizePositiveInteger(
      merged.difficultyGoalMs.Medium,
      DEFAULT_SETTINGS.difficultyGoalMs.Medium
    ),
    Hard: normalizePositiveInteger(
      merged.difficultyGoalMs.Hard,
      DEFAULT_SETTINGS.difficultyGoalMs.Hard
    ),
  };

  if (
    typeof merged.activeCourseId !== "string" ||
    !merged.activeCourseId.trim()
  ) {
    merged.activeCourseId = DEFAULT_COURSE_ID;
  }

  for (const setName of BUILT_IN_SETS) {
    if (typeof merged.setsEnabled[setName] !== "boolean") {
      merged.setsEnabled[setName] = true;
    }
  }

  if (typeof merged.setsEnabled.LeetCode150 !== "boolean") {
    merged.setsEnabled.LeetCode150 = true;
  }

  if (typeof merged.setsEnabled.Custom !== "boolean") {
    merged.setsEnabled.Custom = true;
  }

  return merged;
}

function normalizeNonNegativeInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : fallback;
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.round(value))
    : fallback;
}

function normalizeNumberInRange(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
}

function normalizeNotificationTime(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  return match ? value.trim() : null;
}

/** Normalizes the stored payload into the current `AppData` runtime shape. */
export function normalizeStoredAppData(stored?: StoredAppData): AppData {
  const data: AppData = {
    schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
    problemsBySlug: stored?.problemsBySlug ?? {},
    studyStatesBySlug: Object.fromEntries(
      Object.entries(stored?.studyStatesBySlug ?? {}).map(([slug, state]) => [
        slug,
        normalizeStudyState(state),
      ])
    ),
    coursesById: stored?.coursesById ?? {},
    courseOrder: Array.isArray(stored?.courseOrder) ? stored.courseOrder : [],
    courseProgressById: stored?.courseProgressById ?? {},
    settings: normalizeSettings(stored?.settings),
  };

  ensureCourseData(data);
  return data;
}

/** Reads, migrates, and returns the current persisted app data snapshot. */
export async function getAppData(): Promise<AppData> {
  const result = await readLocalStorage([STORAGE_KEY, LEGACY_STORAGE_KEY]);
  const current = result[STORAGE_KEY] as StoredAppData | undefined;
  const legacy = result[LEGACY_STORAGE_KEY] as StoredAppData | undefined;
  const usingLegacy = !current && !!legacy;
  const stored = current ?? legacy;

  const normalized = normalizeStoredAppData(stored);
  const needsWriteBack =
    !stored ||
    usingLegacy ||
    stored.schemaVersion !== CURRENT_STORAGE_SCHEMA_VERSION ||
    !stored.coursesById ||
    !stored.courseOrder ||
    !stored.courseProgressById ||
    (stored.settings && "activeStudyPlanId" in stored.settings);

  if (needsWriteBack) {
    await saveAppData(normalized);
  }

  return normalized;
}

/** Persists the current app data snapshot back into extension storage. */
export async function saveAppData(data: AppData): Promise<void> {
  const payload: AppData = {
    schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
    problemsBySlug: data.problemsBySlug,
    studyStatesBySlug: data.studyStatesBySlug,
    coursesById: data.coursesById,
    courseOrder: data.courseOrder,
    courseProgressById: data.courseProgressById,
    settings: normalizeSettings(data.settings),
  };

  ensureCourseData(payload);
  await writeLocalStorage({ [STORAGE_KEY]: payload });
  await removeLocalStorage([LEGACY_STORAGE_KEY]);
}

/** Reads, mutates, and persists the app data in a single repository operation. */
export async function mutateAppData(
  updater: (data: AppData) => AppData | Promise<AppData>
): Promise<AppData> {
  const current = await getAppData();
  const updated = await updater(current);
  ensureCourseData(updated);
  await saveAppData(updated);
  return updated;
}

/** Merges a settings patch while preserving normalized nested defaults. */
export function mergeSettings(
  current: UserSettings,
  patch: LegacySettingsPatch
): UserSettings {
  const patchDailyQuestionGoal =
    patch.dailyQuestionGoal ??
    (typeof patch.dailyNewLimit === "number" &&
    Number.isFinite(patch.dailyNewLimit) &&
    typeof patch.dailyReviewLimit === "number" &&
    Number.isFinite(patch.dailyReviewLimit)
      ? patch.dailyNewLimit + patch.dailyReviewLimit
      : current.dailyQuestionGoal);

  return normalizeSettings({
    ...current,
    ...patch,
    dailyQuestionGoal: patchDailyQuestionGoal,
    activeCourseId:
      patch.activeCourseId || patch.activeStudyPlanId || current.activeCourseId,
    difficultyGoalMs: {
      ...current.difficultyGoalMs,
      ...(patch.difficultyGoalMs ?? {}),
    },
    quietHours: {
      ...current.quietHours,
      ...(patch.quietHours ?? {}),
    },
    setsEnabled: {
      ...current.setsEnabled,
      ...(patch.setsEnabled ?? {}),
    },
  });
}

export { STORAGE_KEY };
