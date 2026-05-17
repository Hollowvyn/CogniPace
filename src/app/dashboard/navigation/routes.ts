import {
  DASHBOARD_VIEW_PATHS,
  type DashboardModalBackground,
  type DashboardView,
} from "@libs/runtime-rpc/url";

export type { DashboardView };

declare module "@tanstack/router-core" {
  interface StaticDataRouteOption {
    dashboardView?: DashboardView;
  }
}

export interface DashboardRoute {
  copy: string;
  label: string;
  path: string;
  view: DashboardView;
}

export const problemRoutePaths = {
  newPath: "problems/new",
  editPath: "problems/$slugId/edit",
  publicNewTo: "/problems/new",
  publicEditTo: "/problems/$slugId/edit",
} as const;

export const problemModalRoutes = {
  library: {
    newTo: "/library/problems/new",
    editTo: "/library/problems/$slugId/edit",
  },
  tracks: {
    newTo: "/tracks/problems/new",
    editTo: "/tracks/problems/$slugId/edit",
  },
} as const satisfies Record<
  DashboardModalBackground,
  { editTo: string; newTo: string }
>;

const dashboardRouteByView: Record<DashboardView, DashboardRoute> = {
  dashboard: {
    view: "dashboard",
    label: "Dashboard",
    path: DASHBOARD_VIEW_PATHS.dashboard,
    copy: "The best next move for retention and the live state of your active path.",
  },
  tracks: {
    view: "tracks",
    label: "Tracks",
    path: DASHBOARD_VIEW_PATHS.tracks,
    copy: "Active track at the top, group-by-group progression, and intake for curated paths.",
  },
  library: {
    view: "library",
    label: "Library",
    path: DASHBOARD_VIEW_PATHS.library,
    copy: "Inspect every tracked problem, its review state, and course membership.",
  },
  analytics: {
    view: "analytics",
    label: "Analytics",
    path: DASHBOARD_VIEW_PATHS.analytics,
    copy: "Retention, due load, weakest items, and course completion signals.",
  },
  settings: {
    view: "settings",
    label: "Settings",
    path: DASHBOARD_VIEW_PATHS.settings,
    copy: "Global configuration for review cadence, automation behavior, and alerts.",
  },
};

export const dashboardRoutes = Object.values(dashboardRouteByView);

export function getDashboardRoute(view: DashboardView): DashboardRoute {
  return dashboardRouteByView[view];
}
