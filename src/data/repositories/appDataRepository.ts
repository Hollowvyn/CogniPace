/** Repository for persisted app data stored in `chrome.storage.local`. */
import {
  CURRENT_STORAGE_SCHEMA_VERSION,
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
  const result = await readLocalStorage([STORAGE_KEY]);
  const stored = result[STORAGE_KEY] as StoredAppData | undefined;

  const normalized = normalizeStoredAppData(stored);
  const storedSettings = stored?.settings;
  const settingsNeedsWriteBack =
    !isPersistedUserSettings(storedSettings) ||
    !areUserSettingsEqual(normalized.settings, storedSettings);
  const needsWriteBack =
    !stored ||
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
}

/**
 * Serialised mutation pipeline. Without this, parallel `mutateAppData`
 * calls (e.g. UI fires while a background alarm fires) both read the
 * same baseline and one write clobbers the other. The chain forces each
 * read/transform/write cycle to run after the previous has resolved;
 * errors are swallowed at the chain level so one rejected mutation does
 * not poison subsequent ones (the original promise still rejects to its
 * caller).
 */
let mutationChain: Promise<unknown> = Promise.resolve();

/** Reads, mutates, and persists the app data in a single repository operation. */
export async function mutateAppData(
  updater: (data: AppData) => AppData | Promise<AppData>
): Promise<AppData> {
  const next = mutationChain.then(async () => {
    const current = await getAppData();
    const updated = await updater(current);
    ensureCourseData(updated);
    await saveAppData(updated);
    return updated;
  });
  mutationChain = next.catch(() => undefined);
  return next;
}

/** Merges a settings patch while preserving grouped persisted settings. */
export function mergeSettings(
  current: AppData["settings"],
  patch: UserSettingsPatch
): AppData["settings"] {
  return mergeUserSettings(current, patch);
}

export { STORAGE_KEY };
