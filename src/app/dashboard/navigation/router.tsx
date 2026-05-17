import { AnalyticsScreen } from "@features/analytics";
import { OverviewScreen } from "@features/app-shell";
import {
  LibraryScreen,
  ProblemFormDialog,
  problemRepository,
  type Problem,
  useProblemFormViewModel,
} from "@features/problems";
import { createDefaultProblemTableCommands } from "@features/problems/ui/components/problemsTable";
import { SettingsScreen as SettingsView } from "@features/settings";
import { TracksScreen as TracksView } from "@features/tracks";
import {
  isDashboardModalBackground,
  type DashboardModalBackground,
  type DashboardView,
} from "@libs/runtime-rpc/url";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { asProblemSlug, type ProblemSlug } from "@shared/ids";
import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  useBlocker,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DashboardControllerProvider,
  useDashboardController,
} from "../DashboardControllerContext";
import { DashboardHeader } from "../sections/DashboardHeader";
import { DashboardRail } from "../sections/DashboardRail";
import { DashboardFrame } from "../sections/DashboardSurface";
import { PreV7BackupSnackbar } from "../sections/PreV7BackupSnackbar";
import { useDashboardShellVM } from "../useDashboardShellVM";

import { getDashboardRoute, getDashboardViewForPathname } from "./routes";

import type { ProblemTableCommands } from "@features/problems/ui/components/problemsTable";

interface DashboardProblemSearch {
  background: DashboardModalBackground;
}

const rootRoute = createRootRoute({
  component: DashboardRootLayout,
  notFoundComponent: DashboardNotFoundRoute,
});

const overviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardOverviewRoute,
});

const tracksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "tracks",
  component: DashboardTracksRoute,
});

const libraryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "library",
  component: DashboardLibraryRoute,
});

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "analytics",
  component: DashboardAnalyticsRoute,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings",
  component: DashboardSettingsRoute,
});

const problemNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "problems/new",
  validateSearch: validateProblemSearch,
  component: DashboardProblemNewRoute,
});

const problemEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "problems/$slugId/edit",
  validateSearch: validateProblemSearch,
  component: DashboardProblemEditRoute,
});

const routeTree = rootRoute.addChildren([
  overviewRoute,
  tracksRoute,
  libraryRoute,
  analyticsRoute,
  settingsRoute,
  problemNewRoute,
  problemEditRoute,
]);

export function createDashboardRouter() {
  return createRouter({
    routeTree,
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

function DashboardRootLayout() {
  const controller = useDashboardShellVM();
  const navigate = useNavigate();
  const activeView = useActiveDashboardView();
  const activeRoute = getDashboardRoute(activeView);

  return (
    <DashboardControllerProvider value={controller}>
      <DashboardFrame>
        <Stack
          alignItems={{ lg: "flex-start", xs: "stretch" }}
          direction={{ lg: "row", xs: "column" }}
          spacing={2}
        >
          <DashboardRail
            activeView={activeView}
            onNavigate={(view) => {
              void navigate({ to: getDashboardRoute(view).path });
            }}
          />

          <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
            <Stack spacing={2} sx={{ minWidth: 0, width: "100%" }}>
              <DashboardHeader
                onOpenSettings={() => {
                  void navigate({ to: getDashboardRoute("settings").path });
                }}
                onRefresh={() => {
                  void controller.refresh();
                }}
                route={activeRoute}
                status={controller.status}
              />
              <Outlet />
            </Stack>
          </Box>
        </Stack>

        <PreV7BackupSnackbar />
      </DashboardFrame>
    </DashboardControllerProvider>
  );
}

function DashboardOverviewRoute() {
  const controller = useDashboardController();
  const navigate = useNavigate();
  return (
    <OverviewScreen
      onGoToSettings={() =>
        void navigate({ to: getDashboardRoute("settings").path })
      }
      onGoToTracks={() =>
        void navigate({ to: getDashboardRoute("tracks").path })
      }
      onOpenProblem={async (target) => {
        try {
          await problemRepository.openProblemPage(target);
        } catch (err) {
          controller.setStatus({
            message: (err as Error).message || "Failed to open problem.",
            isError: true,
            scope: target.trackId ? "track" : "recommendation",
          });
        }
      }}
      onToggleMode={controller.onToggleMode}
      payload={controller.payload}
    />
  );
}

function DashboardTracksRoute() {
  const commands = useDashboardProblemTableCommands();
  const editProblem = useEditProblemNavigation("tracks");
  const navigate = useNavigate();
  return (
    <TracksView
      problemCommands={commands}
      onEditProblem={editProblem}
      onCreateProblem={() => {
        void navigate({
          to: "/problems/new",
          search: { background: "tracks" },
        });
      }}
    />
  );
}

function DashboardLibraryRoute() {
  return <DashboardLibraryContent />;
}

function DashboardAnalyticsRoute() {
  const controller = useDashboardController();
  return <AnalyticsScreen payload={controller.payload} />;
}

function DashboardSettingsRoute() {
  const controller = useDashboardController();
  return (
    <SettingsView
      currentSettings={controller.payload?.settings ?? null}
      importFile={controller.importFile}
      onExportData={controller.onExportData}
      onImportData={controller.onImportData}
      onResetStudyHistory={() => {
        void controller.onResetStudyHistory();
      }}
      onSetImportFile={controller.setImportFile}
      onSettingsSaved={controller.applySavedSettings}
      onStatus={controller.setStatus}
    />
  );
}

function DashboardProblemNewRoute() {
  const search = problemNewRoute.useSearch();
  return <DashboardProblemModal background={search.background} />;
}

function DashboardProblemEditRoute() {
  const params = problemEditRoute.useParams();
  const search = problemEditRoute.useSearch();
  return (
    <DashboardProblemModal
      background={search.background}
      slugId={asProblemSlug(params.slugId)}
    />
  );
}

function DashboardProblemModal(props: {
  background: DashboardModalBackground;
  slugId?: ProblemSlug;
}) {
  useProblemFormRouteController(props.background);

  return (
    <>
      <DashboardBackgroundContent view={props.background} />
      <ProblemFormDialog slugId={props.slugId} />
    </>
  );
}

function useProblemFormRouteController(background: DashboardModalBackground) {
  const { refresh, setStatus } = useDashboardController();
  const dispatch = useProblemFormViewModel((state) => state.dispatch);
  const formEffect = useProblemFormViewModel((state) => state.uiEffect);
  const isDirty = useProblemFormViewModel((state) => state.uiState.isDirty);
  const navigate = useNavigate();
  const closeTo = getDashboardRoute(background).path;

  useBlocker({
    disabled: !isDirty,
    enableBeforeUnload: isDirty,
    shouldBlockFn: () =>
      isDirty && !window.confirm("Discard unsaved problem changes?"),
  });

  const close = useCallback(
    (replace = true): void => {
      void navigate({
        to: closeTo,
        replace,
        ignoreBlocker: true,
      });
    },
    [closeTo, navigate]
  );

  useEffect(() => {
    if (!formEffect) return;

    dispatch({ type: "ConsumeEffect", id: formEffect.id });

    if (formEffect.type === "CloseRequested") {
      if (isDirty && !window.confirm("Discard unsaved problem changes?")) {
        return;
      }
      close(true);
      return;
    }

    void (async () => {
      setStatus({
        message:
          formEffect.mode === "create" ? "Problem added." : "Problem updated.",
        isError: false,
      });
      await refresh(false);
      close(true);
    })();
  }, [close, dispatch, formEffect, isDirty, refresh, setStatus]);
}

function DashboardBackgroundContent(props: { view: DashboardModalBackground }) {
  if (props.view === "tracks") {
    return <DashboardTracksRoute />;
  }
  return <DashboardLibraryContent />;
}

function DashboardLibraryContent() {
  const controller = useDashboardController();
  const commands = useDashboardProblemTableCommands();
  const editProblem = useEditProblemNavigation("library");
  const navigate = useNavigate();
  return (
    <LibraryScreen
      commands={commands}
      onEditProblem={editProblem}
      onCreateProblem={() => {
        void navigate({
          to: "/problems/new",
          search: { background: "library" },
        });
      }}
      onRefresh={controller.refresh}
      payload={controller.payload}
    />
  );
}

function DashboardNotFoundRoute() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({ to: "/", replace: true });
  }, [navigate]);

  return null;
}

function useDashboardProblemTableCommands(): ProblemTableCommands {
  const { refresh } = useDashboardController();
  return useMemo(() => {
    return createDefaultProblemTableCommands(() => refresh(false));
  }, [refresh]);
}

function useEditProblemNavigation(background: DashboardModalBackground) {
  const navigate = useNavigate();
  return useCallback(
    (problem: Problem): void => {
      void navigate({
        to: "/problems/$slugId/edit",
        params: { slugId: problem.slug },
        search: { background },
      });
    },
    [background, navigate]
  );
}

function useActiveDashboardView(): DashboardView {
  const location = useRouterState({ select: (state) => state.location });
  return useMemo(() => {
    const background = (location.search as { background?: unknown }).background;
    return getDashboardViewForPathname(location.pathname, background);
  }, [location.pathname, location.search]);
}

function validateProblemSearch(
  search: Record<string, unknown>
): DashboardProblemSearch {
  if (!isDashboardModalBackground(search.background)) {
    throw new Error("Invalid dashboard problem background.");
  }
  return { background: search.background };
}
