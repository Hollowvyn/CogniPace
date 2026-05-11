/**
 * Drizzle ORM client wired to @sqlite.org/sqlite-wasm via the sqlite-proxy
 * adapter. Phase 3 deliverable.
 *
 * `createDb({ migrationSql })` is the pure factory: it initialises the
 * wasm runtime, opens an in-memory SQLite DB, optionally applies the
 * given migration SQL, and returns a Drizzle instance bound to the full
 * schema. No singleton caching here — the caller (the service-worker
 * bootstrap in Phase 6, or a test) owns the lifecycle.
 *
 * Migration SQL is supplied by the caller rather than being read from
 * disk because:
 *   1. MV3 service workers have no filesystem access.
 *   2. The build step bundles the migration as a string asset; Node
 *      tests read it via fs.
 * Keeping the I/O outside this module makes the client portable across
 * SW, browser, and Node test environments.
 */
import sqlite3InitModule, {
  type Database,
  type Sqlite3Static,
} from "@sqlite.org/sqlite-wasm";
import {
  drizzle,
  type SqliteRemoteDatabase,
} from "drizzle-orm/sqlite-proxy";

import { createProxyCallback } from "./proxy";
import * as schema from "./schema";

export type DbSchema = typeof schema;
export type Db = SqliteRemoteDatabase<DbSchema>;

export interface CreateDbOptions {
  /** SQLite filename or special name. Defaults to in-memory. */
  filename?: string;
  /**
   * Concatenated migration SQL (typically the contents of
   * `src/data/db/migrations/*.sql`). If omitted, the DB is left empty
   * — useful only for tests that build their own schema inline.
   */
  migrationSql?: string;
}

export interface DbHandle {
  /** Drizzle instance, bound to the full schema + casing config. */
  db: Db;
  /** Raw wasm DB — exposed for snapshot export and the migrator. */
  rawDb: Database;
  /** The wasm runtime, in case callers need capi or other APIs. */
  sqlite3: Sqlite3Static;
}

let cachedSqlite3: Promise<Sqlite3Static> | undefined;

function loadSqlite3(): Promise<Sqlite3Static> {
  if (!cachedSqlite3) {
    cachedSqlite3 = sqlite3InitModule();
  }
  return cachedSqlite3;
}

/**
 * Initialise a fresh Drizzle-on-wasm DB. Pure factory — does not cache.
 * The wasm runtime itself IS cached, since `sqlite3InitModule()` is
 * idempotent-but-expensive.
 */
export async function createDb(
  options: CreateDbOptions = {},
): Promise<DbHandle> {
  const sqlite3 = await loadSqlite3();
  const rawDb = new sqlite3.oo1.DB(options.filename ?? ":memory:", "c");
  if (options.migrationSql) {
    rawDb.exec(options.migrationSql);
  }
  // Schema columns use explicit snake_case names (see schema.ts), so we
  // intentionally do NOT pass `casing: "snake_case"` — drizzle-orm@0.45.2's
  // sqlite-proxy driver has an arg-shuffle bug where casing is silently
  // dropped in the 2-arg form. Explicit column names sidestep the bug
  // entirely.
  const db = drizzle(createProxyCallback(rawDb), { schema });
  return { db, rawDb, sqlite3 };
}
