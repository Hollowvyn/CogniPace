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
  const merged: UserSettings = {
    ...DEFAULT_SETTINGS,
    ...(input ?? {}),
    activeCourseId: nextActiveCourseId,
    quietHours: {
      ...DEFAULT_SETTINGS.quietHours,
      ...(input?.quietHours ?? {}),
    },
    setsEnabled: {
      ...DEFAULT_SETTINGS.setsEnabled,
      ...(input?.setsEnabled ?? {}),
    },
  };

  if (merged.studyMode !== "freestyle" && merged.studyMode !== "studyPlan") {
    merged.studyMode = DEFAULT_SETTINGS.studyMode;
  }

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
  return normalizeSettings({
    ...current,
    ...patch,
    activeCourseId:
      patch.activeCourseId || patch.activeStudyPlanId || current.activeCourseId,
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
