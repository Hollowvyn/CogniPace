/**
 * Service-worker DB singleton. Lazy-initialises the wasm SQLite DB on
 * first call, restores from snapshot when available (fingerprint
 * matches the current migration) or seeds catalog data when not,
 * registers a debounced snapshot-on-mutation hook, and caches the
 * handle at module scope so subsequent calls reuse the same connection.
 *
 * Phase 6 reality (snapshot persistence):
 *   Boot:
 *     1. Read fingerprint + snapshot bytes from chrome.storage.local.
 *     2. If fingerprint matches the current migration's hash, restore.
 *     3. Else (fresh install OR schema change), drop the stored snapshot,
 *        run the migration, seed catalog topics, write a fresh snapshot.
 *   Steady state:
 *     - Every mutation through Drizzle (the proxy's `run` path) bumps
 *       a debounce timer; when the timer fires, the in-memory DB is
 *       serialised and written back to chrome.storage.local.
 *   Suspend:
 *     - `flushSnapshot()` forces an immediate save without waiting for
 *       the debounce — wired to chrome.runtime.onSuspend in the SW
 *       entry point.
 *
 * Production code should always use `getDb()`; tests construct their
 * own DB via `createDb()` in `client.ts`.
 */
import { seedInitialSettings } from "@features/settings/server";
import { buildTrackCatalogSeed } from "@features/tracks/data/seed";
import { seedCatalogTracks } from "@features/tracks/server";
import { tick } from "@libs/event-bus";

import { listCatalogCompanySeeds } from "../../data/catalog/companiesSeed";
import { listCatalogPlans } from "../../data/catalog/curatedSets";
import { buildProblemSeed } from "../../data/catalog/problemsSeed";
import { listCatalogTopicSeeds } from "../../data/catalog/topicsSeed";
import { seedCatalogCompanies } from "../../data/companies/repository";
import { seedCatalogProblems } from "../../data/problems/repository";
import { seedCatalogTopics } from "../../data/topics/repository";
import { nowIso } from "../../domain/common/time";


import { createDb, type DbHandle } from "./client";
import migrationSql from "./migrations/0000_initial.sql";
import { setOnMutationHook } from "./proxy";
import {
  clearSnapshot,
  computeFingerprint,
  deserializeDb,
  readSnapshotFromStorage,
  serializeDb,
  writeSnapshotToStorage,
} from "./snapshot";

import type { Problem } from "../../domain/types";

let bootPromise: Promise<DbHandle> | undefined;
let liveHandle: DbHandle | undefined;
let liveFingerprint: string | undefined;
let pendingSaveTimer: ReturnType<typeof setTimeout> | undefined;
let pendingSavePromise: Promise<void> | undefined;

const SNAPSHOT_DEBOUNCE_MS = 1000;

/** Builds the catalog Problem seed by walking the curated plans. */
function buildCatalogProblems(): Problem[] {
  const plans = listCatalogPlans();
  const seed = buildProblemSeed(plans, nowIso());
  return Object.values(seed);
}

async function persistSnapshot(): Promise<void> {
  if (!liveHandle || !liveFingerprint) return;
  const bytes = serializeDb(liveHandle);
  await writeSnapshotToStorage({ fingerprint: liveFingerprint, bytes });
}

/**
 * Debounced snapshot scheduler. Each call resets the timer; after
 * SNAPSHOT_DEBOUNCE_MS of mutation quiet, a save runs. Save failures
 * are logged (not thrown) — losing one debounced save is recoverable
 * (the next mutation triggers another); throwing here would corrupt
 * the proxy's mutation flow.
 */
function scheduleSnapshotSave(): void {
  if (pendingSaveTimer !== undefined) clearTimeout(pendingSaveTimer);
  pendingSaveTimer = setTimeout(() => {
    pendingSaveTimer = undefined;
    pendingSavePromise = persistSnapshot().catch((err) => {
      console.error("[CogniPace] snapshot save failed:", err);
    });
  }, SNAPSHOT_DEBOUNCE_MS);
}

/**
 * Forces an immediate snapshot save, bypassing the debounce. Awaits
 * any in-flight save first so we don't race ourselves. Intended for
 * `chrome.runtime.onSuspend` — the SW has only a few seconds before
 * eviction, so we can't afford to wait out a debounce.
 */
export async function flushSnapshot(): Promise<void> {
  if (pendingSaveTimer !== undefined) {
    clearTimeout(pendingSaveTimer);
    pendingSaveTimer = undefined;
  }
  if (pendingSavePromise) {
    await pendingSavePromise.catch(() => undefined);
  }
  await persistSnapshot();
}

async function bootDb(): Promise<DbHandle> {
  console.log("[CogniPace] bootDb: starting");
  const handle = await createDb({
    locateWasm: (file) => chrome.runtime.getURL(file),
  });
  console.log("[CogniPace] bootDb: wasm DB created");
  const fingerprint = computeFingerprint(migrationSql);
  const stored = await readSnapshotFromStorage();

  if (stored && stored.fingerprint === fingerprint) {
    console.log(
      `[CogniPace] bootDb: restoring from snapshot (${stored.bytes.length} bytes, fp=${fingerprint})`,
    );
    try {
      deserializeDb(handle, stored.bytes);
    } catch (err) {
      console.error(
        "[CogniPace] bootDb: deserialize FAILED, falling back to fresh seed:",
        err,
      );
      await clearSnapshot();
      handle.rawDb.exec(migrationSql);
      await seedCatalogTopics(handle.db, listCatalogTopicSeeds());
      await seedCatalogCompanies(handle.db, listCatalogCompanySeeds());
      await seedInitialSettings(handle.db);
      await seedCatalogProblems(handle.db, buildCatalogProblems());
      await seedCatalogTracks(handle.db, buildTrackCatalogSeed());
      const bytes = serializeDb(handle);
      await writeSnapshotToStorage({ fingerprint, bytes });
    }
    // Always ensure catalog problems + tracks are present, including on
    // restore paths where an earlier snapshot may pre-date the Phase 5
    // problems / tracks slices. Idempotent via ON CONFLICT DO NOTHING.
    await seedCatalogProblems(handle.db, buildCatalogProblems());
    await seedCatalogTracks(handle.db, buildTrackCatalogSeed());
  } else {
    if (stored) {
      console.log(
        `[CogniPace] bootDb: schema fingerprint mismatch (stored=${stored.fingerprint}, current=${fingerprint}); wiping snapshot`,
      );
      await clearSnapshot();
    } else {
      console.log(`[CogniPace] bootDb: no snapshot found (fp=${fingerprint}); fresh seed`);
    }
    handle.rawDb.exec(migrationSql);
    await seedCatalogTopics(handle.db, listCatalogTopicSeeds());
    await seedCatalogCompanies(handle.db, listCatalogCompanySeeds());
    await seedInitialSettings(handle.db);
    await seedCatalogProblems(handle.db, buildCatalogProblems());
    await seedCatalogTracks(handle.db, buildTrackCatalogSeed());
    const bytes = serializeDb(handle);
    await writeSnapshotToStorage({ fingerprint, bytes });
    console.log(`[CogniPace] bootDb: fresh seed complete, snapshot written (${bytes.length} bytes)`);
  }

  liveHandle = handle;
  liveFingerprint = fingerprint;
  // Two-tier reactivity: immediate broadcast for UI re-fetch (Phase 7
  // lite) + debounced snapshot persistence (Phase 6). Both run on the
  // same `run` proxy event; the broadcast is fire-and-forget so it
  // doesn't slow the mutation's response path.
  setOnMutationHook(() => {
    // Wildcard scope: until per-feature scoped writers land in Phase 6+,
    // every SQLite mutation wakes all subscribers (today's behavior).
    // The scope filtering plumbing is in place so features can opt
    // into narrow scopes without touching the proxy.
    tick({ table: "*" });
    scheduleSnapshotSave();
  });

  console.log("[CogniPace] bootDb: ready");
  return handle;
}

/**
 * Resolves to the live `DbHandle`. First call boots; subsequent calls
 * return the cached promise. Safe to call from concurrent handlers —
 * the promise serialises the boot for in-flight callers.
 */
export function getDb(): Promise<DbHandle> {
  if (!bootPromise) {
    bootPromise = bootDb();
  }
  return bootPromise;
}

/**
 * Test/debug hook: drops the cached handle so the next `getDb()` boots
 * a fresh DB. Also unhooks the mutation observer so the dropped DB
 * doesn't accidentally write a stale snapshot. Production code should
 * not call this.
 */
export function resetDbForTesting(): void {
  bootPromise = undefined;
  liveHandle = undefined;
  liveFingerprint = undefined;
  setOnMutationHook(null);
  if (pendingSaveTimer !== undefined) {
    clearTimeout(pendingSaveTimer);
    pendingSaveTimer = undefined;
  }
}
