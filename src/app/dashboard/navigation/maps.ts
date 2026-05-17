import { isDashboardModalBackground } from "@libs/runtime-rpc/url";

import { dashboardRoutes } from "./routes";

import type { DashboardRoute, DashboardView } from "./routes";

const DASHBOARD_ROUTE_BY_VIEW = new Map<DashboardView, DashboardRoute>(
  dashboardRoutes.map((route) => [route.view, route])
);

const DASHBOARD_VIEW_BY_PATH = new Map<string, DashboardView>(
  dashboardRoutes.map((route) => [route.path, route.view])
);

/** Returns the route metadata for the requested view. */
export function getDashboardRoute(view: DashboardView): DashboardRoute {
  return DASHBOARD_ROUTE_BY_VIEW.get(view) ?? dashboardRoutes[0];
}

export function getDashboardViewForPathname(
  pathname: string,
  background?: unknown
): DashboardView {
  const view = DASHBOARD_VIEW_BY_PATH.get(pathname);
  if (view) {
    return view;
  }
  if (pathname.startsWith("/problems/")) {
    return isDashboardModalBackground(background) ? background : "dashboard";
  }
  return "dashboard";
}
