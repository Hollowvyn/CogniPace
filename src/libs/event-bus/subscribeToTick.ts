import { STORAGE_KEY } from "../../domain/common/constants";

import { DB_TICK_KEY } from "./utils/DB_TICK_KEY";

import type { TickScope } from "./TickScope";

export type TickHandler = (scope: TickScope) => void;

const handlers = new Set<TickHandler>();
let storageListener:
  | ((
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ) => void)
  | null = null;

function ensureListener(): void {
  if (storageListener) return;
  if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return;

  storageListener = (changes, areaName) => {
    if (areaName !== "local") return;

    let scope: TickScope | null = null;

    const tickChange = changes[DB_TICK_KEY];
    if (tickChange) {
      const newValue = tickChange.newValue as { scope?: TickScope } | undefined;
      scope = newValue?.scope ?? { table: "*" };
    } else if (STORAGE_KEY in changes) {
      // v7 blob path — still in use until Phase 8 retires it. Treat any
      // blob change as a wildcard scope so existing subscribers wake.
      scope = { table: "*" };
    }

    if (!scope) return;
    for (const handler of handlers) handler(scope);
  };

  chrome.storage.onChanged.addListener(storageListener);
}

function maybeUnregisterListener(): void {
  if (handlers.size > 0) return;
  if (!storageListener) return;
  if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return;

  chrome.storage.onChanged.removeListener(storageListener);
  storageListener = null;
}

/**
 * Subscribes to broadcast ticks across all extension surfaces. One
 * `chrome.storage.onChanged` listener is shared by every caller in a
 * given runtime; refcounted by handler set. Returns an unsubscribe
 * callback.
 *
 * Listens to both the SQLite tick (`cognipace_db_tick`) and the legacy
 * v7 blob key (`STORAGE_KEY`). The v7 path is treated as a wildcard
 * scope so existing subscribers wake; remove that branch in Phase 8
 * when v7 is retired.
 */
export function subscribeToTick(handler: TickHandler): () => void {
  handlers.add(handler);
  ensureListener();
  return () => {
    handlers.delete(handler);
    maybeUnregisterListener();
  };
}
