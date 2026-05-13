/** Repository for persisted app data stored in `chrome.storage.local`. */
import {
  areUserSettingsEqual,
  createInitialUserSettings,
  sanitizeStoredUserSettings,
  UserSettings,
} from "@features/settings/server";
import { normalizeStudyState } from "@libs/fsrs/studyState";
import {
  readLocalStorage,
  writeLocalStorage,
} from "@platform/chrome/storage";

import { AppData } from "../../domain/types";

import {
  CURRENT_STORAGE_SCHEMA_VERSION,
  STORAGE_KEY,
} from "./v7/constants";

/** Sidecar key holding the pre-v7 blob (auto-export-then-wipe migration). */
export const PRE_V7_BACKUP_KEY = `${STORAGE_KEY}_pre_v7_backup` as const;

export type StoredAppData = Partial<AppData> & {
  settings?: unknown;
  schemaVersion?: number;
};

/**
 * Normalizes the stored payload into the current `AppData` runtime shape.
 * Post-Phase-5: every aggregate (problems, study states, topics,
 * companies, tracks, settings) is SSoT in SQLite. The fields kept here
 * are intentionally `{}` — the SW boot seeds SQLite, the dashboard
 * handler hydrates them at read time. Phase 8 deletes the AppData
 * blob entirely.
 */
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
    topicsById: stored?.topicsById ?? {},
    companiesById: stored?.companiesById ?? {},
    settings:
      stored?.settings === undefined
        ? createInitialUserSettings()
        : sanitizeStoredUserSettings(stored.settings),
    lastMigrationAt: stored?.lastMigrationAt,
  };

  return data;
}

/** Reads, migrates, and returns the current persisted app data snapshot. */
export async function getAppData(): Promise<AppData> {
  const result = await readLocalStorage([STORAGE_KEY]);
  const stored = result[STORAGE_KEY] as StoredAppData | undefined;

  const normalized = normalizeStoredAppData(stored);
  // Sanitize is idempotent, so structural equality between the raw
  // stored blob and the normalized snapshot is the write-back signal:
  // if anything was coerced (missing field, out-of-range value),
  // they'll differ and we re-persist the canonical shape.
  const needsWriteBack =
    !stored ||
    stored.schemaVersion !== CURRENT_STORAGE_SCHEMA_VERSION ||
    !areUserSettingsEqual(normalized.settings, stored.settings as UserSettings);

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
    topicsById: data.topicsById,
    companiesById: data.companiesById,
    settings: sanitizeStoredUserSettings(data.settings),
    lastMigrationAt: data.lastMigrationAt,
  };

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
    await saveAppData(updated);
    return updated;
  });
  mutationChain = next.catch(() => undefined);
  return next;
}

export { STORAGE_KEY };
