import { AnalyticsScreen } from "@features/analytics";
import { OverviewScreen } from "@features/app-shell";
import {
  LibraryScreen,
  ProblemFormDialog,
  problemRepository,
  type Problem,
  type ProblemFormDialogCloseReason,
} from "@features/problems";
import { createDefaultProblemTableCommands } from "@features/problems/ui/components/problemsTable";
import { SettingsScreen as SettingsView } from "@features/settings";
import { TracksScreen as TracksView } from "@features/tracks";
import {
  type DashboardModalBackground,
  type DashboardView,
} from "@libs/runtime-rpc/url";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { asProblemSlug, type ProblemSlug } from "@shared/ids";
import {
  Outlet,
  useNavigate,
  useParams,
  useRouterState,
} from "@tanstack/react-router";
import { useCallback, useEffect, useMemo } from "react";

import {
  DashboardControllerProvider,
  useDashboardController,
} from "../DashboardControllerContext";
import { DashboardHeader } from "../sections/DashboardHeader";
import { DashboardRail } from "../sections/DashboardRail";
import { DashboardFrame } from "../sections/DashboardSurface";
import { PreV7BackupSnackbar } from "../sections/PreV7BackupSnackbar";
import { useDashboardShellVM } from "../useDashboardShellVM";

import { getDashboardRoute, problemModalRoutes } from "./routes";

import type { ProblemTableCommands } from "@features/problems/ui/components/problemsTable";

export function DashboardRootLayout() {
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

export function DashboardOverviewRoute() {
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

export function DashboardTracksRoute() {
  return (
    <>
      <DashboardTracksContent />
      <Outlet />
    </>
  );
}

export function DashboardLibraryRoute() {
  return (
    <>
      <DashboardLibraryContent />
      <Outlet />
    </>
  );
}

export function DashboardAnalyticsRoute() {
  const controller = useDashboardController();
  return <AnalyticsScreen payload={controller.payload} />;
}

export function DashboardSettingsRoute() {
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

export function DashboardLibraryProblemRoute() {
  return <DashboardProblemModalRoute background="library" />;
}

export function DashboardTracksProblemRoute() {
  return <DashboardProblemModalRoute background="tracks" />;
}

export function DashboardNotFoundRoute() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({ to: "/", replace: true });
  }, [navigate]);

  return null;
}

function DashboardTracksContent() {
  const commands = useDashboardProblemTableCommands();
  const editProblem = useEditProblemNavigation("tracks");
  const navigate = useNavigate();
  return (
    <TracksView
      problemCommands={commands}
      onEditProblem={editProblem}
      onCreateProblem={() => {
        void navigate({ to: problemModalRoutes.tracks.newTo });
      }}
    />
  );
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
        void navigate({ to: problemModalRoutes.library.newTo });
      }}
      onRefresh={controller.refresh}
      payload={controller.payload}
    />
  );
}

function DashboardProblemModalRoute(props: {
  background: DashboardModalBackground;
}) {
  const slugId = useParams({
    strict: false,
    select: (params) => {
      const value = (params as { slugId?: unknown }).slugId;
      return typeof value === "string" ? asProblemSlug(value) : undefined;
    },
  });

  return (
    <DashboardProblemModal background={props.background} slugId={slugId} />
  );
}

function DashboardProblemModal(props: {
  background: DashboardModalBackground;
  slugId?: ProblemSlug;
}) {
  const { refresh, setStatus } = useDashboardController();
  const navigate = useNavigate();
  const closeTo = getDashboardRoute(props.background).path;
  const formKey = props.slugId ? `edit:${props.slugId}` : "new";
  const close = useCallback(
    (reason: ProblemFormDialogCloseReason): void => {
      if (reason.type === "saved") {
        setStatus({
          message:
            reason.mode === "create" ? "Problem added." : "Problem updated.",
          isError: false,
        });
        void refresh(false);
      }
      void navigate({ to: closeTo, replace: true });
    },
    [closeTo, navigate, refresh, setStatus]
  );

  return (
    <ProblemFormDialog key={formKey} onClose={close} slugId={props.slugId} />
  );
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
        to: problemModalRoutes[background].editTo,
        params: { slugId: problem.slug },
      });
    },
    [background, navigate]
  );
}

function useActiveDashboardView(): DashboardView {
  const matches = useRouterState({ select: (state) => state.matches });
  return useMemo(() => {
    for (let index = matches.length - 1; index >= 0; index -= 1) {
      const view = matches[index]?.staticData.dashboardView;
      if (view) {
        return view;
      }
    }
    return "dashboard";
  }, [matches]);
}
