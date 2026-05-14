/** Thin typed wrappers over the Chrome tabs / runtime URL surface that
 *  feature handlers actually need. Features import these — not `chrome.*`
 *  directly — so the side-effect surface is one folder away from the
 *  domain code and is trivially fake-able in tests.
 *
 *  Keep this file narrow: add a function the day a handler needs it,
 *  not before. We deliberately do NOT expose a `chrome.tabs.query`-shaped
 *  generic API; every export here matches a real call site. */

/** Updates an existing tab to point at the given URL. */
export async function updateTabUrl(tabId: number, url: string): Promise<void> {
  await chrome.tabs.update(tabId, { url });
}

/** Opens a new tab at the given URL. */
export async function openTab(url: string): Promise<void> {
  await chrome.tabs.create({ url });
}

/** Resolves an extension-relative path (e.g. "dashboard.html") to its
 *  full chrome-extension:// URL. */
export function extensionUrl(path: string): string {
  return chrome.runtime.getURL(path);
}

/** True when the current thread is running inside the extension's
 *  chrome.runtime context (vs a vite dev server or jsdom test). Used
 *  by UI hooks to switch between live SW round-trips and mock data. */
export function isExtensionContext(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);
}
