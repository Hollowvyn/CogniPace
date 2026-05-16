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

import { listCatalogCompanySeeds , listCatalogPlans , buildProblemSeed , listCatalogTopicSeeds , seedCatalogCompanies , seedCatalogProblems , seedCatalogTopics } from "@features/problems/server";
import { seedInitialSettings } from "@features/settings/server";
import {
  buildTrackCatalogSeed,
  seedCatalogTracks,
} from "@features/tracks/server";
import { tick } from "@libs/event-bus";
import { nowIso } from "@platform/time";


import { createDb, type DbHandle } from "./client";
import migrationSql from "./migrations/0000_initial.sql";
import migration0001 from "./migrations/0001_big_marvel_apes.sql";
import migration0002 from "./migrations/0002_amazing_microchip.sql";
import { setOnMutationHook } from "./proxy";
import {
  clearSnapshot,
  computeFingerprint,
  deserializeDb,
  readSnapshotFromStorage,
  serializeDb,
  writeSnapshotToStorage,
} from "./snapshot";
import { tableFromSql } from "./tableFromSql";

import type { Problem } from "@features/problems";

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

/**
 * Idempotent DDL upgrades that run on every boot, after both snapshot
 * restore and fresh install. Each statement uses IF NOT EXISTS so it is
 * safe to re-run against a DB that already has the table.
 *
 * Add a new entry here whenever a migration adds a table that must be
 * present in existing snapshots without triggering a full reseed.
 */
function applyUpgrades(handle: DbHandle): void {
  handle.rawDb.exec(migration0001.replace(/CREATE TABLE/g, "CREATE TABLE IF NOT EXISTS"));
  handle.rawDb.exec(migration0002.replace(/CREATE TABLE/g, "CREATE TABLE IF NOT EXISTS"));

  // Populate junction tables from existing JSON arrays (idempotent via INSERT OR IGNORE).
  handle.rawDb.exec(`
    INSERT OR IGNORE INTO problem_topics (problem_slug, topic_id)
    SELECT p.slug, je.value
    FROM problems p, json_each(p.topic_ids) je
    WHERE p.topic_ids IS NOT NULL AND p.topic_ids != '[]';

    INSERT OR IGNORE INTO problem_companies (problem_slug, company_id)
    SELECT p.slug, je.value
    FROM problems p, json_each(p.company_ids) je
    WHERE p.company_ids IS NOT NULL AND p.company_ids != '[]';
  `);
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
      applyUpgrades(handle);
      await seedCatalogTopics(handle.db, listCatalogTopicSeeds());
      await seedCatalogCompanies(handle.db, listCatalogCompanySeeds());
      await seedInitialSettings(handle.db);
      await seedCatalogProblems(handle.db, buildCatalogProblems());
      await seedCatalogTracks(handle.db, buildTrackCatalogSeed());
      const bytes = serializeDb(handle);
      await writeSnapshotToStorage({ fingerprint, bytes });
    }
    // Apply any DDL upgrades that post-date this snapshot (idempotent).
    applyUpgrades(handle);
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
    applyUpgrades(handle);
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
  setOnMutationHook((sql) => {
    // Per-table tick. `tableFromSql` returns null for DDL / pragmas /
    // transaction control — those don't represent user-visible
    // mutations, so we skip the broadcast for them. Unparseable
    // (e.g. raw deserialize-path SQL) also returns null and is
    // silently skipped, which is the correct behaviour: snapshot
    // restore at boot shouldn't wake subscribers.
    const table = tableFromSql(sql);
    if (table) tick({ table });
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

