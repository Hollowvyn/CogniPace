/**
 * Service-worker DB singleton. Lazy-initialises the wasm SQLite DB on
 * first call, applies the canonical migration, seeds catalog topics,
 * and caches the handle at module scope so subsequent calls reuse the
 * same connection.
 *
 * Phase 4 reality (strict, no persistence): MV3 service workers can be
 * evicted from memory; every wake re-evaluates this module, which
 * resets the cache, which re-runs boot. User-created topics that aren't
 * persisted to chrome.storage yet will not survive the wake — that's
 * a known cost of strict Phase 4 and is what Phase 6 fixes.
 *
 * Production code should always use `getDb()`; tests construct their
 * own DB via `createDb()` in `client.ts`.
 */
import { listCatalogTopicSeeds } from "../catalog/topicsSeed";
import { seedCatalogTopics } from "../topics/repository";

import { createDb, type DbHandle } from "./client";
import migrationSql from "./migrations/0000_initial.sql";

let bootPromise: Promise<DbHandle> | undefined;

async function bootDb(): Promise<DbHandle> {
  const handle = await createDb({
    migrationSql,
    locateWasm: (file) => chrome.runtime.getURL(file),
  });
  await seedCatalogTopics(handle.db, listCatalogTopicSeeds());
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
 * a fresh DB. Production code should not call this.
 */
export function resetDbForTesting(): void {
  bootPromise = undefined;
}
