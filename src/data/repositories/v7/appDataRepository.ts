/**
 * v7 appDataRepository — IO funnel for the v7 schema.
 *
 *   - `getAppDataV7()` reads `chrome.storage.local`, detects pre-v7 blobs,
 *     writes them to a sidecar key, and returns a fresh v7 snapshot when a
 *     migration occurred.
 *   - `mutateAppDataV7()` runs an updater closure on a fresh draft and
 *     persists. Mutations are serialised through a Promise chain so two
 *     concurrent callers cannot lose writes (alarm + UI is the realistic
 *     race).
 *   - `consumeSidecarBackup()` exposes the sidecar payload to UI surfaces
 *     once, after which the key is cleared.
 *
 * The repository is intentionally the only place where chrome.storage is
 * touched in the v7 layer. Everything else is pure-mutator.
 */
import { STORAGE_KEY } from "../../../domain/common/constants";
import { nowIso } from "../../../domain/common/time";
import { STORAGE_SCHEMA_VERSION_V7 } from "../../../domain/data/appDataV7";
import {
  readLocalStorage,
  removeLocalStorage,
  writeLocalStorage,
} from "../../datasources/chrome/storage";

import { aggregates } from "./aggregateRegistry";
import { buildFreshAppDataV7 } from "./seed";

import type { AppDataV7 } from "../../../domain/data/appDataV7";

/**
 * Sidecar key holding the pre-v7 blob. UI mounts read this once, prompt
 * the user to download, and clear it via `consumeSidecarBackup`.
 */
export const PRE_V7_BACKUP_KEY = `${STORAGE_KEY}_pre_v7_backup` as const;

interface StoredBlob {
  schemaVersion?: number;
  [key: string]: unknown;
}

let mutationChain: Promise<unknown> = Promise.resolve();

/**
 * Reads the v7 snapshot, migrating from v6 (or any pre-v7 shape) on
 * first encounter. The migration is destructive: the pre-v7 blob is
 * preserved under `PRE_V7_BACKUP_KEY` for the user to download, then a
 * fresh v7 snapshot is written.
 */
export async function getAppDataV7(): Promise<AppDataV7> {
  const result = await readLocalStorage([STORAGE_KEY]);
  const stored = result[STORAGE_KEY] as StoredBlob | undefined;

  if (isV7Blob(stored)) {
    return reconcileV7(stored, nowIso());
  }

  // Either no stored blob (fresh install) or pre-v7 (migration).
  const now = nowIso();
  if (stored) {
    await writeLocalStorage({ [PRE_V7_BACKUP_KEY]: stored });
  }
  const fresh = buildFreshAppDataV7(now);
  await writeLocalStorage({ [STORAGE_KEY]: fresh });
  return fresh;
}

/** Persists a v7 snapshot. */
export async function saveAppDataV7(data: AppDataV7): Promise<void> {
  await writeLocalStorage({ [STORAGE_KEY]: { ...data, schemaVersion: STORAGE_SCHEMA_VERSION_V7 } });
}

/**
 * Read → mutate → save. The closure receives a fresh draft per call and
 * must return the same draft (or a new value). Mutations are serialised
 * so back-to-back calls never collide on storage IO.
 */
export async function mutateAppDataV7(
  updater: (data: AppDataV7) => AppDataV7 | Promise<AppDataV7>,
): Promise<AppDataV7> {
  const next = mutationChain.then(async () => {
    const current = await getAppDataV7();
    const updated = await updater(current);
    await saveAppDataV7(updated);
    return updated;
  });
  mutationChain = next.catch(() => undefined);
  return next;
}

/**
 * Returns the pre-v7 backup once and clears it. UI mounts call this and
 * surface a download prompt — the sidecar lives in storage only until
 * the user has had a chance to retrieve it.
 */
export async function consumeSidecarBackup(): Promise<unknown> {
  const result = await readLocalStorage([PRE_V7_BACKUP_KEY]);
  const blob = result[PRE_V7_BACKUP_KEY];
  if (!blob) return null;
  await removeLocalStorage([PRE_V7_BACKUP_KEY]);
  return blob;
}

/** True when the stored blob is recognisably v7-shaped. */
function isV7Blob(blob: StoredBlob | undefined): blob is StoredBlob & {
  schemaVersion: number;
} {
  return (
    blob !== undefined &&
    typeof blob.schemaVersion === "number" &&
    blob.schemaVersion === STORAGE_SCHEMA_VERSION_V7
  );
}

/**
 * Defensive merge that ensures a stored v7 blob has every aggregate root
 * present. Missing fields are filled from a fresh seed (curated topics,
 * companies, sets) so a partially-corrupted blob does not crash the app.
 */
function reconcileV7(blob: StoredBlob, now: string): AppDataV7 {
  const fresh = buildFreshAppDataV7(now);
  const reconciled: AppDataV7 = {
    schemaVersion: STORAGE_SCHEMA_VERSION_V7,
    problemsBySlug: aggregateValue(blob, "problemsBySlug", fresh),
    studyStatesBySlug: aggregateValue(blob, "studyStatesBySlug", fresh),
    topicsById: aggregateValue(blob, "topicsById", fresh),
    companiesById: aggregateValue(blob, "companiesById", fresh),
    studySetsById: aggregateValue(blob, "studySetsById", fresh),
    studySetOrder: aggregateValue(blob, "studySetOrder", fresh),
    studySetProgressById: aggregateValue(blob, "studySetProgressById", fresh),
    settings: (blob.settings as AppDataV7["settings"]) ?? fresh.settings,
    lastMigrationAt:
      typeof blob.lastMigrationAt === "string"
        ? blob.lastMigrationAt
        : fresh.lastMigrationAt,
  };
  return reconciled;
}

function aggregateValue<K extends (typeof aggregates)[number]["key"]>(
  blob: StoredBlob,
  key: K,
  fresh: AppDataV7,
): AppDataV7[K] {
  const raw = blob[key];
  if (raw === undefined || raw === null) {
    return fresh[key];
  }
  const sanitiser = aggregates.find((a) => a.key === key)?.sanitize;
  if (!sanitiser) return fresh[key];
  return sanitiser(raw) as AppDataV7[K];
}
