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

export type DashboardView =
  | "dashboard"
  | "tracks"
  | "library"
  | "analytics"
  | "settings";

export type DashboardModalBackground = "library" | "tracks";

const ALLOWED_MODAL_BACKGROUNDS = new Set<DashboardModalBackground>([
  "library",
  "tracks",
]);

export const DASHBOARD_VIEW_PATHS: Record<DashboardView, string> = {
  dashboard: "/",
  tracks: "/tracks",
  library: "/library",
  analytics: "/analytics",
  settings: "/settings",
};

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

export function isDashboardModalBackground(
  value: unknown
): value is DashboardModalBackground {
  return (
    typeof value === "string" &&
    ALLOWED_MODAL_BACKGROUNDS.has(value as DashboardModalBackground)
  );
}

function dashboardPathForView(view: DashboardView): string {
  return DASHBOARD_VIEW_PATHS[view];
}

export function dashboardExtensionPathForView(view: DashboardView): string {
  return `dashboard.html#${dashboardPathForView(view)}`;
}

function dashboardProblemCreatePath(
  background: DashboardModalBackground = "library"
): string {
  return `dashboard.html#/problems/new?background=${background}`;
}

function dashboardProblemEditPath(
  slugInput: string,
  background: DashboardModalBackground = "library"
): string {
  const slug = normalizeSlug(slugInput);
  if (!slug) {
    throw new Error("Invalid slug.");
  }
  return `dashboard.html#/problems/${slug}/edit?background=${background}`;
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
  try {
    if (decodeURIComponent(value).includes("..")) {
      throw new Error("Invalid extension path.");
    }
  } catch {
    throw new Error("Invalid extension path.");
  }

  const parsed = new URL(value, "https://extension.invalid/");
  const fileName = parsed.pathname.replace(/^\//, "");

  if (fileName === "dashboard.html") {
    return validateDashboardPath(parsed);
  }

  throw new Error("Unknown extension path.");
}

function validateDashboardPath(parsed: URL): string {
  if (parsed.search) {
    throw new Error("Invalid dashboard path.");
  }

  if (!parsed.hash) {
    return dashboardExtensionPathForView("dashboard");
  }

  return validateDashboardHash(parsed.hash);
}

function validateDashboardHash(hash: string): string {
  const raw = hash.slice(1);
  if (!raw || raw === "/") {
    return dashboardExtensionPathForView("dashboard");
  }
  if (!raw.startsWith("/")) {
    throw new Error("Invalid dashboard path.");
  }

  const parsed = new URL(raw, "https://dashboard.invalid");
  if (parsed.hash) {
    throw new Error("Invalid dashboard path.");
  }
  const pathPart = parsed.pathname;

  if (Object.values(DASHBOARD_VIEW_PATHS).includes(pathPart)) {
    if (parsed.search) {
      throw new Error("Invalid dashboard path.");
    }
    return `dashboard.html#${pathPart}`;
  }

  if (pathPart === "/problems/new") {
    return dashboardProblemCreatePath(
      validateModalBackground(parsed.searchParams)
    );
  }

  const editMatch = /^\/problems\/([^/]+)\/edit$/.exec(pathPart);
  if (editMatch) {
    const slugSegment = decodeURIComponent(editMatch[1] ?? "");
    const slug = normalizeSlug(slugSegment);
    if (!slug || slug !== slugSegment) {
      throw new Error("Invalid dashboard problem route.");
    }
    return dashboardProblemEditPath(
      slug,
      validateModalBackground(parsed.searchParams)
    );
  }

  throw new Error("Invalid dashboard path.");
}

function validateModalBackground(
  searchParams: URLSearchParams
): DashboardModalBackground {
  const params: string[] = [];
  let backgroundCount = 0;
  searchParams.forEach((_, key) => {
    params.push(key);
    if (key === "background") {
      backgroundCount += 1;
    }
  });
  if (params.some((key) => key !== "background")) {
    throw new Error("Invalid dashboard problem route.");
  }
  if (backgroundCount > 1) {
    throw new Error("Invalid dashboard problem route.");
  }

  const background = searchParams.get("background");
  if (!background) {
    throw new Error("Invalid dashboard problem route.");
  }
  if (!isDashboardModalBackground(background)) {
    throw new Error("Invalid dashboard problem background.");
  }
  return background;
}
