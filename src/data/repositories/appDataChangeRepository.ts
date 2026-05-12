/** Repository for observing persisted app-data changes from extension UI surfaces. */
import { STORAGE_KEY } from "../../domain/common/constants";
import { DB_TICK_KEY } from "../db/broadcast";

/**
 * Subscribes to local app-data changes and returns an unsubscribe callback.
 *
 * Listens for two signals:
 *  - Legacy v7 blob key (`leetcode_spaced_repetition_data_v2`) — fires
 *    whenever a v7-blob handler (still active for problems / sets /
 *    studyStates) calls saveAppData.
 *  - SQLite tick key (`cognipace_db_tick`) — fires whenever the SW's
 *    Drizzle proxy observes a mutation. This is the bridge that makes
 *    SQLite-backed reads (topics, companies, settings) update the UI
 *    in real time without the user having to refresh.
 */
export function subscribeToAppDataChanges(onChange: () => void): () => void {
  if (typeof chrome === "undefined" || !chrome.storage?.onChanged) {
    return () => undefined;
  }

  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ) => {
    if (areaName !== "local") return;
    if (STORAGE_KEY in changes || DB_TICK_KEY in changes) {
      onChange();
    }
  };

  chrome.storage.onChanged.addListener(listener);
  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}
