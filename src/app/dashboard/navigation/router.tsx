import {
  isDashboardModalBackground,
  type DashboardModalBackground,
} from "@libs/runtime-rpc/url";
import {
  createHashHistory,
  createRoute,
  createRouteMask,
  createRootRoute,
  createRouter,
  redirect,
  RouterProvider,
} from "@tanstack/react-router";
import { useState } from "react";

import {
  DashboardAnalyticsRoute,
  DashboardLibraryProblemRoute,
  DashboardLibraryRoute,
  DashboardNotFoundRoute,
  DashboardOverviewRoute,
  DashboardRootLayout,
  DashboardSettingsRoute,
  DashboardTracksProblemRoute,
  DashboardTracksRoute,
} from "./DashboardRouteComponents";
import { problemModalRoutes, problemRoutePaths } from "./routes";

interface DashboardProblemSearch {
  background: DashboardModalBackground;
}

const MODAL_BACKGROUNDS = ["library", "tracks"] as const;

const rootRoute = createRootRoute({
  component: DashboardRootLayout,
  notFoundComponent: DashboardNotFoundRoute,
});

const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardOverviewRoute,
  staticData: { dashboardView: "dashboard" },
});

const tracksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "tracks",
  component: DashboardTracksRoute,
  staticData: { dashboardView: "tracks" },
});

const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "library",
  component: DashboardLibraryRoute,
  staticData: { dashboardView: "library" },
});

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "analytics",
  component: DashboardAnalyticsRoute,
  staticData: { dashboardView: "analytics" },
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings",
  component: DashboardSettingsRoute,
  staticData: { dashboardView: "settings" },
});

const libraryProblemNewRoute = createRoute({
  getParentRoute: () => libraryRoute,
  path: problemRoutePaths.newPath,
  component: DashboardLibraryProblemRoute,
});

const libraryProblemEditRoute = createRoute({
  getParentRoute: () => libraryRoute,
  path: problemRoutePaths.editPath,
  component: DashboardLibraryProblemRoute,
});

const tracksProblemNewRoute = createRoute({
  getParentRoute: () => tracksRoute,
  path: problemRoutePaths.newPath,
  component: DashboardTracksProblemRoute,
});

const tracksProblemEditRoute = createRoute({
  getParentRoute: () => tracksRoute,
  path: problemRoutePaths.editPath,
  component: DashboardTracksProblemRoute,
});

const problemNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: problemRoutePaths.newPath,
  validateSearch: validateProblemSearch,
  beforeLoad: ({ search }) => {
    return redirect({
      to: problemModalRoutes[search.background].newTo,
      replace: true,
    });
  },
});

const problemEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: problemRoutePaths.editPath,
  validateSearch: validateProblemSearch,
  beforeLoad: ({ params, search }) => {
    return redirect({
      to: problemModalRoutes[search.background].editTo,
      params: { slugId: params.slugId },
      replace: true,
    });
  },
});

const routeTree = rootRoute.addChildren([
  overviewRoute,
  tracksRoute.addChildren([tracksProblemNewRoute, tracksProblemEditRoute]),
  libraryRoute.addChildren([libraryProblemNewRoute, libraryProblemEditRoute]),
  analyticsRoute,
  settingsRoute,
  problemNewRoute,
  problemEditRoute,
]);

const dashboardRouteMasks = MODAL_BACKGROUNDS.flatMap((background) => [
  createRouteMask({
    routeTree,
    from: problemModalRoutes[background].newTo,
    to: problemRoutePaths.publicNewTo,
    search: { background },
    unmaskOnReload: true,
  }),
  createRouteMask({
    routeTree,
    from: problemModalRoutes[background].editTo,
    to: problemRoutePaths.publicEditTo,
    search: { background },
    unmaskOnReload: true,
  }),
]);

export function createDashboardRouter() {
  return createRouter({
    routeTree,
    routeMasks: dashboardRouteMasks,
    history: createHashHistory(),
    scrollToTopSelectors: [],
  });
}

export const dashboardRouter = createDashboardRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof dashboardRouter;
  }
}

export function DashboardRouterProvider(props: {
  router?: ReturnType<typeof createDashboardRouter>;
}) {
  const [router] = useState(() => props.router ?? createDashboardRouter());

  return <RouterProvider router={router} />;
}

function validateProblemSearch(search: Record<string, unknown>) {
  const background = search.background;
  if (background === undefined) {
    return { background: "library" } satisfies DashboardProblemSearch;
  }
  if (isDashboardModalBackground(background)) {
    return { background } satisfies DashboardProblemSearch;
  }
  throw new Error("Invalid dashboard problem background.");
}
