/** Repository for extension-owned page navigation triggered by UI surfaces. */

/** Opens the dashboard in a new tab, preserving the existing `?view=` contract. */
export function openDashboardPage(
  view?: string,
  windowRef: Window = window
): void {
  const url = new URL(
    typeof chrome !== "undefined" && chrome.runtime?.id
      ? chrome.runtime.getURL("dashboard.html")
      : `${windowRef.location.origin}/dashboard.html`
  );

  if (view) {
    url.searchParams.set("view", view);
  }

  if (typeof chrome !== "undefined" && chrome.tabs?.create) {
    chrome.tabs.create({ url: url.toString() });
    return;
  }

  windowRef.open(url.toString(), "_blank", "noopener,noreferrer");
}

/** Opens the dashboard directly on the settings screen. */
export function openSettingsPage(windowRef: Window = window): void {
  openDashboardPage("settings", windowRef);
}
