/** Opens the dashboard in a new tab, preserving the existing `?view=`
 *  contract. Used by the popup's "Open dashboard / settings" intents.
 *
 *  In an extension context, uses `chrome.tabs.create` with the extension
 *  URL. In dev/jsdom (no extension runtime), falls back to
 *  `windowRef.open` against an origin-relative path so the function
 *  remains testable without stubbing chrome. */
import { extensionUrl, isExtensionContext, openTab } from "@platform/chrome/tabs";

export type ExtensionDashboardView =
  | "dashboard"
  | "tracks"
  | "library"
  | "analytics"
  | "settings";

export function openDashboardPage(
  view?: ExtensionDashboardView,
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

