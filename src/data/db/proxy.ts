/**
 * sqlite-proxy callback for @sqlite.org/sqlite-wasm.
 *
 * Bridges Drizzle's `drizzle-orm/sqlite-proxy` driver to a raw
 * `@sqlite.org/sqlite-wasm` Database instance. The contract Drizzle
 * expects (from https://orm.drizzle.team/docs/connect-drizzle-proxy):
 *
 *   async (sql, params, method) => Promise<{ rows: ... }>
 *
 * For `get`:                rows is a flat tuple   [c0, c1, ..., cN]
 * For `all` / `values`:     rows is array of tuples  [[c0, c1], [c0, c1]]
 * For `run`:                rows is empty array      []
 *
 * Charter lesson #1 (the trap that broke prior attempts): the wasm
 * library's `Stmt.get(array)` does NOT fill the array positionally as
 * the user expects — it can produce nested wrapping. The safe pattern is
 * to fetch column-by-column via `stmt.get(i)` for i in [0, columnCount),
 * and to control the row-wrapping shape ourselves. That is what this
 * module does, and the wasm test in tests/data/db/proxy.test.ts pins
 * the contract against the real wasm runtime.
 */
import type { Database, SqlValue } from "@sqlite.org/sqlite-wasm";

export type ProxyMethod = "run" | "all" | "get" | "values";

export interface ProxyResult {
  rows: SqlValue[] | SqlValue[][];
}

/**
 * Run a single SQL statement against the wasm DB and shape the result
 * per Drizzle's sqlite-proxy contract. Synchronous internally; wrapped
 * by `createProxyCallback` for the async signature Drizzle expects.
 */
export function execProxy(
  rawDb: Database,
  sql: string,
  params: readonly SqlValue[],
  method: ProxyMethod,
): ProxyResult {
  const stmt = rawDb.prepare(sql);
  try {
    if (params.length > 0) {
      stmt.bind(params);
    }

    if (method === "run") {
      stmt.step();
      return { rows: [] };
    }

    const rows: SqlValue[][] = [];
    while (stmt.step()) {
      const columnCount = stmt.columnCount;
      const row: SqlValue[] = [];
      for (let i = 0; i < columnCount; i++) {
        row.push(stmt.get(i));
      }
      rows.push(row);
      if (method === "get") break;
    }

    if (method === "get") {
      return { rows: rows[0] ?? [] };
    }

    return { rows };
  } finally {
    stmt.finalize();
  }
}

/**
 * Module-scoped mutation hook. Set by `instance.ts` after boot so the
 * SW can schedule a debounced snapshot whenever a mutation runs through
 * the proxy. Null in test/debug contexts where no persistence is wired.
 *
 * Stored as a single function rather than per-DB to keep the proxy
 * callback factory ergonomic; in practice only one production DB is
 * live at a time inside a given runtime (SW or extension page).
 */
let onMutationHook: (() => void) | null = null;

/** Wires (or clears) the mutation observer. Tests / dbDebug never call
 * this, so the hook stays null and their in-memory DBs are not
 * persisted to chrome.storage. */
export function setOnMutationHook(hook: (() => void) | null): void {
  onMutationHook = hook;
}

/**
 * Factory: returns the async callback Drizzle's sqlite-proxy driver
 * accepts at `drizzle(callback, ...)`. The underlying wasm calls are
 * synchronous, so we resolve the promise eagerly — but the async
 * signature is preserved so that a future OPFS-backed worker driver
 * can drop in without rewriting consumers.
 *
 * When `method === "run"` and `setOnMutationHook(...)` has been called,
 * the hook is invoked after a successful execution so the SW can
 * schedule a debounced snapshot. DDL (CREATE TABLE, indexes) goes
 * through `run` too — but instance.ts only sets the hook *after* the
 * initial migration finishes, so boot-time DDL doesn't trigger
 * snapshot churn.
 */
export function createProxyCallback(
  rawDb: Database,
): (
  sql: string,
  params: SqlValue[],
  method: ProxyMethod,
) => Promise<ProxyResult> {
  return (sql, params, method) => {
    const result = execProxy(rawDb, sql, params, method);
    if (method === "run" && onMutationHook) {
      onMutationHook();
    }
    return Promise.resolve(result);
  };
}
