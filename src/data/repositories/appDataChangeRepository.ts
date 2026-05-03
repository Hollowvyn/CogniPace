/** Repository for observing persisted app-data changes from extension UI surfaces. */
import { STORAGE_KEY } from "../../domain/common/constants";

/** Subscribes to local app-data changes and returns an unsubscribe callback. */
export function subscribeToAppDataChanges(onChange: () => void): () => void {
  if (typeof chrome === "undefined" || !chrome.storage?.onChanged) {
    return () => undefined;
  }

  const listener = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ) => {
    if (areaName === "local" && STORAGE_KEY in changes) {
      onChange();
    }
  };

  chrome.storage.onChanged.addListener(listener);
  return () => {
    chrome.storage.onChanged.removeListener(listener);
  };
}
