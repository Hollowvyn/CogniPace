/** Opens the dashboard in a new tab, preserving the existing `?view=`
 * contract. Used by popup intents that jump into a specific dashboard
 * surface from outside the dashboard shell itself.
 *
 * In an extension context, uses `chrome.tabs.create` with the extension
 * URL. In dev/jsdom (no extension runtime), falls back to
 * `windowRef.open` against an origin-relative path so the function
 * remains testable without stubbing chrome. */
import { extensionUrl, isExtensionContext, openTab } from "@platform/chrome/tabs";

import { type DashboardView } from "./routes";

export function openDashboardPage(
  view?: DashboardView,
  windowRef: Window = window,
): void {
  const baseUrl = isExtensionContext()
    ? extensionUrl("dashboard.html")
    : `${windowRef.location.origin}/dashboard.html`;
  const url = new URL(baseUrl);
  if (view) {
    url.searchParams.set("view", view);
  }

  if (isExtensionContext()) {
    void openTab(url.toString());
    return;
  }

  windowRef.open(url.toString(), "_blank", "noopener,noreferrer");
}
