/** Dashboard deep-link model for the hash-route contract. */
import {
  DASHBOARD_VIEW_PATHS,
  isDashboardModalBackground,
  type DashboardView,
} from "@libs/runtime-rpc/url";

export type { DashboardView };

/** Route metadata rendered by the dashboard shell and rail navigation. */
export interface DashboardRoute {
  copy: string;
  label: string;
  path: string;
  view: DashboardView;
}

/** Canonical dashboard route table. */
export const dashboardRoutes: DashboardRoute[] = [
  {
    view: "dashboard",
    label: "Dashboard",
    path: DASHBOARD_VIEW_PATHS.dashboard,
    copy: "The best next move for retention and the live state of your active path.",
  },
  {
    view: "tracks",
    label: "Tracks",
    path: DASHBOARD_VIEW_PATHS.tracks,
    copy: "Active track at the top, group-by-group progression, and intake for curated paths.",
  },
  {
    view: "library",
    label: "Library",
    path: DASHBOARD_VIEW_PATHS.library,
    copy: "Inspect every tracked problem, its review state, and course membership.",
  },
  {
    view: "analytics",
    label: "Analytics",
    path: DASHBOARD_VIEW_PATHS.analytics,
    copy: "Retention, due load, weakest items, and course completion signals.",
  },
  {
    view: "settings",
    label: "Settings",
    path: DASHBOARD_VIEW_PATHS.settings,
    copy: "Global configuration for review cadence, automation behavior, and alerts.",
  },
];

/** Returns the route metadata for the requested view. */
export function getDashboardRoute(view: DashboardView): DashboardRoute {
  return (
    dashboardRoutes.find((route) => route.view === view) ?? dashboardRoutes[0]
  );
}

export function getDashboardViewForPathname(
  pathname: string,
  background?: unknown
): DashboardView {
  const route = dashboardRoutes.find((item) => item.path === pathname);
  if (route) {
    return route.view;
  }
  if (pathname.startsWith("/problems/")) {
    return isDashboardModalBackground(background) ? background : "dashboard";
  }
  return "dashboard";
}
