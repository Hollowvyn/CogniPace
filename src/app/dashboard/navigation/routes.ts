/** Dashboard route declarations for the hash-route contract. */
import { DASHBOARD_VIEW_PATHS, type DashboardView } from "@libs/runtime-rpc/url";

export type { DashboardView };

/** Route metadata rendered by the dashboard shell and rail navigation. */
export interface DashboardRoute {
  copy: string;
  label: string;
  path: string;
  view: DashboardView;
}

export const DASHBOARD_PROBLEM_NEW_PATH = "problems/new";
export const DASHBOARD_PROBLEM_EDIT_PATH = "problems/$slugId/edit";
export const DASHBOARD_PROBLEM_NEW_TO = toDashboardRoutePath(
  DASHBOARD_PROBLEM_NEW_PATH
);
export const DASHBOARD_PROBLEM_EDIT_TO = toDashboardRoutePath(
  DASHBOARD_PROBLEM_EDIT_PATH
);

function toDashboardRoutePath<const TPath extends string>(
  path: TPath
): `/${TPath}` {
  return `/${path}`;
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
