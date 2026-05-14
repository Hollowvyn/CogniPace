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

    const tickChange = changes[DB_TICK_KEY];
    if (!tickChange) return;
    const newValue = tickChange.newValue as { scope?: TickScope } | undefined;
    const scope: TickScope = newValue?.scope ?? { table: "*" };

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
 * callback. Listens for the SQLite tick (`cognipace_db_tick`) only —
 * the v7 blob path has been retired.
 */
export function subscribeToTick(handler: TickHandler): () => void {
  handlers.add(handler);
  ensureListener();
  return () => {
    handlers.delete(handler);
    maybeUnregisterListener();
  };
}
