/** Repository for persisted app data stored in `chrome.storage.local`. */
import {
  CURRENT_STORAGE_SCHEMA_VERSION,
  STORAGE_KEY,
} from "../../domain/common/constants";
import { nowIso } from "../../domain/common/time";
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
import { buildCompanySeed } from "../catalog/companiesSeed";
import { listCatalogPlans } from "../catalog/curatedSets";
import { buildProblemSeed } from "../catalog/problemsSeed";
import { buildStudySetSeed } from "../catalog/studySetsSeed";
import { buildTopicSeed } from "../catalog/topicsSeed";
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
  // Curated Problem seed runs only on a totally-empty store — the very
  // first launch. v6→v7 migrations preserve the user's existing
  // problemsBySlug; later reads keep whatever's persisted (deleted
  // problems stay deleted).
  const isFirstEverLaunch = !stored;

  // Seed the v7 aggregates from catalog data when missing. The seed is
  // idempotent — subsequent reads keep the stored values intact.
  const catalogPlans = runMigration || isFirstEverLaunch
    ? listCatalogPlans()
    : null;
  const seededTopics = runMigration ? buildTopicSeed(seedNow) : {};
  const seededCompanies = runMigration ? buildCompanySeed(seedNow) : {};
  const seededStudySets = runMigration && catalogPlans
    ? buildStudySetSeed(catalogPlans, seedNow)
    : { studySetsById: {}, studySetOrder: [] };
  const seededProblems = isFirstEverLaunch && catalogPlans
    ? buildProblemSeed(catalogPlans, seedNow)
    : {};

  const data: AppData = {
    schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
    problemsBySlug: stored?.problemsBySlug ?? seededProblems,
    studyStatesBySlug: Object.fromEntries(
      Object.entries(stored?.studyStatesBySlug ?? {}).map(([slug, state]) => [
        slug,
        normalizeStudyState(state),
      ])
    ),
    // v6 fields (still used by current handlers; will be removed in Phase 8).
    coursesById: stored?.coursesById ?? {},
    courseOrder: Array.isArray(stored?.courseOrder) ? stored.courseOrder : [],
    courseProgressById: stored?.courseProgressById ?? {},
    // v7 aggregate fields. Seeded on first encounter (curated topics +
    // companies + courses); preserved as-is once the user has any data.
    topicsById: { ...seededTopics, ...(stored?.topicsById ?? {}) },
    companiesById: { ...seededCompanies, ...(stored?.companiesById ?? {}) },
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
    topicsById: data.topicsById,
    companiesById: data.companiesById,
    studySetsById: data.studySetsById,
    studySetOrder: data.studySetOrder,
    studySetProgressById: data.studySetProgressById,
    settings: sanitizeStoredUserSettings(data.settings),
    lastMigrationAt: data.lastMigrationAt,
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
