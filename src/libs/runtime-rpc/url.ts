/** URL-shape guards used by SW handlers that open pages on behalf of the UI.
 *
 *  These live next to the proxy because they're cross-feature primitives the
 *  problems handler (openProblemPage) and the app-shell handler
 *  (openExtensionPage) both call — moving them into either feature would
 *  force the other to deep-import across a feature boundary. */
import {
  isProblemPage as _isProblemPage,
  normalizeSlug,
  slugToUrl,
} from "@libs/leetcode";

const ALLOWED_DASHBOARD_VIEWS = new Set([
  "dashboard",
  "tracks",
  "library",
  "analytics",
  "settings",
]);

// Re-export for handler callers that previously imported from
// `@libs/runtime-rpc/validator` (now removed).
export const isProblemPage = _isProblemPage;

/** Canonicalizes a user-supplied slug into a fully-qualified problem URL
 *  the SW can hand to `chrome.tabs.create` / `chrome.tabs.update`. */
export function canonicalProblemUrlForOpen(slugInput: string): string {
  const normalizedSlug = normalizeSlug(slugInput);
  if (!normalizedSlug) {
    throw new Error("Invalid slug.");
  }
  return slugToUrl(normalizedSlug);
}

/** Whitelist of internal extension pages the UI is allowed to open via the
 *  background. Anything that isn't an exact match throws — this is the only
 *  guard between content-script callers and arbitrary file paths inside the
 *  extension package. */
export function validateExtensionPagePath(pathInput: string): string {
  const value = pathInput.trim();
  if (!value) {
    throw new Error("Missing extension path.");
  }
  if (
    /^[a-z][a-z0-9+.-]*:/i.test(value) ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.includes("..")
  ) {
    throw new Error("Invalid extension path.");
  }

  const parsed = new URL(value, "https://extension.invalid/");
  const fileName = parsed.pathname.replace(/^\//, "");
  if (parsed.hash) {
    throw new Error("Invalid extension path.");
  }

  if (fileName === "dashboard.html") {
    const params: string[] = [];
    let viewCount = 0;
    parsed.searchParams.forEach((_, key) => {
      params.push(key);
      if (key === "view") {
        viewCount += 1;
      }
    });
    if (params.some((key) => key !== "view")) {
      throw new Error("Invalid dashboard path.");
    }
    if (viewCount > 1) {
      throw new Error("Invalid dashboard path.");
    }
    const view = parsed.searchParams.get("view");
    if (view && !ALLOWED_DASHBOARD_VIEWS.has(view)) {
      throw new Error("Invalid dashboard view.");
    }
    return view ? `dashboard.html?view=${view}` : "dashboard.html";
  }

  throw new Error("Unknown extension path.");
}
