/** Raw `chrome.storage.local` access used by data repositories. */

/** Reads a set of local storage keys from the extension storage area. */
export async function readLocalStorage(
  keys: string[]
): Promise<Record<string, unknown>> {
  return chrome.storage.local.get(keys);
}

/** Writes values into the extension local storage area. */
export async function writeLocalStorage(
  payload: Record<string, unknown>
): Promise<void> {
  await chrome.storage.local.set(payload);
}

/** Removes keys from the extension local storage area. */
export async function removeLocalStorage(keys: string[]): Promise<void> {
  await chrome.storage.local.remove(keys);
}
