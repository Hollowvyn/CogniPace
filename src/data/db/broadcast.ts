/**
 * SQLite mutation broadcast — Phase 7 lite.
 *
 * On every SW-side mutation through the Drizzle proxy, the SW writes a
 * tiny counter to `chrome.storage.local[cognipace_db_tick]`. Open
 * extension pages observe `chrome.storage.onChanged` for that key and
 * re-fetch through their existing `useAppShellQuery` hooks — no new UI
 * machinery required, no TanStack Query, no chrome.runtime.Port.
 *
 * The write is intentionally NOT debounced: persistence is debounced
 * (snapshot.ts), but reactivity must be immediate to feel responsive.
 * The payload is a single integer plus an ISO timestamp; the storage
 * write is sub-millisecond.
 *
 * In a fresh SW lifetime the counter resets to 0; that's fine, since
 * chrome.storage.onChanged fires on any value change, not strictly on
 * monotonic increases.
 */

/** Shared storage key — exposed so subscribers can wire onto it. */
export const DB_TICK_KEY = "cognipace_db_tick";

interface DbTick {
  /** Monotonic sequence within the current SW lifetime. */
  n: number;
  /** ISO timestamp for diagnostics; not load-bearing. */
  at: string;
}

let counter = 0;

/**
 * Writes a fresh tick to chrome.storage.local. Fire-and-forget on
 * purpose: a dropped broadcast is recoverable (the next mutation will
 * fire another), and awaiting would needlessly slow the SW message
 * handler's response path.
 */
export function broadcastDbTick(): void {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return;
  counter += 1;
  const tick: DbTick = { n: counter, at: new Date().toISOString() };
  void chrome.storage.local.set({ [DB_TICK_KEY]: tick }).catch((err) => {
    console.error("[CogniPace] broadcastDbTick failed:", err);
  });
}
