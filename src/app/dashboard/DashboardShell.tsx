/** Dashboard surface shell — composes feature screens. Driven by
 *  `useDashboardShellVM` per the canonical Screen+VM pattern. */
import { AnalyticsScreen } from "@features/analytics";
import { OverviewScreen } from "@features/app-shell";
import { LibraryScreen } from "@features/problems";
import { SettingsScreen as SettingsView } from "@features/settings";
import { TracksScreen as TracksView } from "@features/tracks";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

import { DashboardHeader } from "./sections/DashboardHeader";
import { DashboardRail } from "./sections/DashboardRail";
import { DashboardFrame } from "./sections/DashboardSurface";
import { PreV7BackupSnackbar } from "./sections/PreV7BackupSnackbar";
import { useDashboardShellVM } from "./useDashboardShellVM";

export function DashboardShell() {
  const controller = useDashboardShellVM();

  return (
    <DashboardFrame>
      <Stack
        alignItems={{ lg: "flex-start", xs: "stretch" }}
        direction={{ lg: "row", xs: "column" }}
        spacing={2}
      >
        <DashboardRail
          activeView={controller.view}
          onNavigate={controller.navigateToView}
        />

        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
          <Stack spacing={2} sx={{ minWidth: 0, width: "100%" }}>
            <DashboardHeader
              onOpenSettings={() => {
                controller.navigateToView("settings");
              }}
              onRefresh={() => {
                void controller.refresh();
              }}
              route={controller.route}
              status={controller.status}
            />

            {controller.view === "dashboard" ? (
              <OverviewScreen
                onGoToSettings={() => controller.navigateToView("settings")}
                onGoToTracks={() => controller.navigateToView("tracks")}
                onOpenProblem={controller.onOpenProblem}
                onToggleMode={controller.onToggleMode}
                payload={controller.payload}
              />
            ) : null}

            {controller.view === "tracks" ? (
              <TracksView />
            ) : null}

            {controller.view === "analytics" ? (
              <AnalyticsScreen payload={controller.payload} />
            ) : null}

            {controller.view === "settings" ? (
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
            ) : null}

            {controller.view === "library" ? (
              <LibraryScreen
                onRefresh={controller.refresh}
                payload={controller.payload}
              />
            ) : null}
          </Stack>
        </Box>
      </Stack>

      <PreV7BackupSnackbar />
    </DashboardFrame>
  );
}
