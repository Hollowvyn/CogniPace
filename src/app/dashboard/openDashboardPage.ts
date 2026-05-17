/** Opens a dashboard hash route from another extension surface.
 *
 * In an extension context, uses `chrome.tabs.create` with the extension
 * URL. In dev/jsdom (no extension runtime), falls back to
 * `windowRef.open` against an origin-relative path so the function
 * remains testable without stubbing chrome. */
import {
  dashboardExtensionPathForView,
  type DashboardView,
} from "@libs/runtime-rpc/url";
import {
  extensionUrl,
  isExtensionContext,
  openTab,
} from "@platform/chrome/tabs";

export function openDashboardPage(
  view?: DashboardView,
  windowRef: Window = window
): void {
  const path = dashboardExtensionPathForView(view ?? "dashboard");
  const url = isExtensionContext()
    ? extensionUrl(path)
    : `${windowRef.location.origin}/${path}`;

  if (isExtensionContext()) {
    void openTab(url);
    return;
  }

  windowRef.open(url, "_blank", "noopener,noreferrer");
}
