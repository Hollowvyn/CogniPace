/** Repository for persisted app data stored in `chrome.storage.local`. */
import {
  CURRENT_STORAGE_SCHEMA_VERSION,
  LEGACY_STORAGE_KEY,
  STORAGE_KEY,
} from "../../domain/common/constants";
import { ensureCourseData } from "../../domain/courses/courseProgress";
import { normalizeStudyState } from "../../domain/fsrs/studyState";
import {
  areUserSettingsEqual,
  createInitialUserSettings,
  isPersistedUserSettings,
  mergeUserSettings,
  sanitizeStoredUserSettings,
  UserSettingsPatch,
} from "../../domain/settings";
import { AppData } from "../../domain/types";
import {
  readLocalStorage,
  removeLocalStorage,
  writeLocalStorage,
} from "../datasources/chrome/storage";

export type StoredAppData = Partial<AppData> & {
  settings?: unknown;
  schemaVersion?: number;
};

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
    settings:
      stored?.settings === undefined
        ? createInitialUserSettings()
        : sanitizeStoredUserSettings(stored.settings),
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
  const storedSettings = stored?.settings;
  const settingsNeedsWriteBack =
    !isPersistedUserSettings(storedSettings) ||
    !areUserSettingsEqual(normalized.settings, storedSettings);
  const needsWriteBack =
    !stored ||
    usingLegacy ||
    stored.schemaVersion !== CURRENT_STORAGE_SCHEMA_VERSION ||
    !stored.coursesById ||
    !stored.courseOrder ||
    !stored.courseProgressById ||
    settingsNeedsWriteBack;

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
    settings: sanitizeStoredUserSettings(data.settings),
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

/** Merges a settings patch while preserving grouped persisted settings. */
export function mergeSettings(
  current: AppData["settings"],
  patch: UserSettingsPatch
): AppData["settings"] {
  return mergeUserSettings(current, patch);
}

export { STORAGE_KEY };
