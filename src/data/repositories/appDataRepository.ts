/** Repository for persisted app data stored in `chrome.storage.local`. */
import {
  CURRENT_STORAGE_SCHEMA_VERSION,
  STORAGE_KEY,
} from "../../domain/common/constants";
import { nowIso } from "../../domain/common/time";
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
import { listCatalogPlans } from "../catalog/curatedSets";
import { buildStudySetSeed } from "../catalog/studySetsSeed";
import {
  readLocalStorage,
  writeLocalStorage,
} from "../datasources/chrome/storage";

/** Sidecar key holding the pre-v7 blob (auto-export-then-wipe migration). */
export const PRE_V7_BACKUP_KEY = `${STORAGE_KEY}_pre_v7_backup` as const;

export type StoredAppData = Partial<AppData> & {
  settings?: unknown;
  schemaVersion?: number;
};

/** True when the stored blob lacks the v7 aggregate fields. */
function needsV7SeedMigration(stored?: StoredAppData): boolean {
  if (!stored) return true;
  const hasTopics = stored.topicsById && Object.keys(stored.topicsById).length > 0;
  const hasCompanies =
    stored.companiesById && Object.keys(stored.companiesById).length > 0;
  const hasSets =
    stored.studySetsById && Object.keys(stored.studySetsById).length > 0;
  return !(hasTopics && hasCompanies && hasSets);
}

/** Normalizes the stored payload into the current `AppData` runtime shape. */
export function normalizeStoredAppData(stored?: StoredAppData): AppData {
  const seedNow = nowIso();
  const runMigration = needsV7SeedMigration(stored);

  // Phase 4+5: topics / companies / problems / settings live in SQLite,
  // not the v7 blob. Their fields stay as `{}` here; the dashboard
  // handler hydrates them at read time from the DB. StudySets remain
  // in the v7 blob for now; Phase 5 tracks slice will migrate them.
  const catalogPlans = runMigration ? listCatalogPlans() : null;
  const seededStudySets = runMigration && catalogPlans
    ? buildStudySetSeed(catalogPlans, seedNow)
    : { studySetsById: {}, studySetOrder: [] };

  const data: AppData = {
    schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
    problemsBySlug: stored?.problemsBySlug ?? {},
    studyStatesBySlug: Object.fromEntries(
      Object.entries(stored?.studyStatesBySlug ?? {}).map(([slug, state]) => [
        slug,
        normalizeStudyState(state),
      ])
    ),
    // v7 aggregate fields. Topics + companies moved to SQLite (Phase
    // 4+5) so those maps are no longer seeded here; the handler layer
    // hydrates them from the DB. Courses still seed from catalog here.
    topicsById: stored?.topicsById ?? {},
    companiesById: stored?.companiesById ?? {},
    studySetsById: {
      ...seededStudySets.studySetsById,
      ...(stored?.studySetsById ?? {}),
    },
    studySetOrder:
      Array.isArray(stored?.studySetOrder) && stored.studySetOrder.length > 0
        ? stored.studySetOrder
        : seededStudySets.studySetOrder,
    studySetProgressById: stored?.studySetProgressById ?? {},
    settings:
      stored?.settings === undefined
        ? createInitialUserSettings()
        : sanitizeStoredUserSettings(stored.settings),
    lastMigrationAt: runMigration
      ? (stored?.lastMigrationAt ?? seedNow)
      : stored?.lastMigrationAt,
  };

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
    !stored.studySetsById ||
    !stored.studySetOrder ||
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
    topicsById: data.topicsById,
    companiesById: data.companiesById,
    studySetsById: data.studySetsById,
    studySetOrder: data.studySetOrder,
    studySetProgressById: data.studySetProgressById,
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

/** Merges a settings patch while preserving grouped persisted settings. */
export function mergeSettings(
  current: AppData["settings"],
  patch: UserSettingsPatch
): AppData["settings"] {
  return mergeUserSettings(current, patch);
}

export { STORAGE_KEY };
