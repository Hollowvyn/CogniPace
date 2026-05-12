import { DB_TICK_KEY } from "./utils/DB_TICK_KEY";

import type { TickScope } from "./TickScope";

interface DbTick {
  readonly n: number;
  readonly at: string;
  readonly scope: TickScope;
}

let counter = 0;

/**
 * Broadcasts a mutation tick to every open extension page. Fire-and-
 * forget on purpose: a dropped broadcast is recoverable (the next
 * mutation will fire another), and awaiting would needlessly slow the
 * SW message handler's response path.
 *
 * Writers stamp `scope` with the table they just wrote to (and
 * optionally the affected row ids). Subscribers ignore ticks whose
 * scope doesn't intersect their key — keeps unrelated UI from waking.
 *
 * Until per-feature scoped writers land, the SQLite proxy emits
 * `{ table: "*" }` after every mutation, so today's behavior is to
 * wake every subscriber regardless of key — the scope-filtering
 * plumbing is groundwork for Phase 6+.
 */
export function tick(scope: TickScope): void {
  if (typeof chrome === "undefined" || !chrome.storage?.local) return;
  counter += 1;
  const payload: DbTick = {
    n: counter,
    at: new Date().toISOString(),
    scope,
  };
  void chrome.storage.local.set({ [DB_TICK_KEY]: payload }).catch((err) => {
    console.error("[CogniPace] tick failed:", err);
  });
}
