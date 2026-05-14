/** Dashboard surface shell — composes feature screens. Driven by
 *  `useDashboardShellVM` per the canonical Screen+VM pattern. */
import { AnalyticsScreen as AnalyticsView } from "@features/analytics";
import { LibraryScreen as LibraryView } from "@features/problems";
import { SettingsScreen as SettingsView } from "@features/settings";
import { TracksScreen as TracksView } from "@features/tracks";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

import { DashboardHeader } from "./sections/DashboardHeader";
import { DashboardRail } from "./sections/DashboardRail";
import { DashboardFrame } from "./sections/DashboardSurface";
import { OverviewView } from "./sections/OverviewView";
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
              <OverviewView
                onOpenProblem={controller.onOpenProblem}
                onSetView={controller.navigateToView}
                onToggleMode={controller.onToggleMode}
                payload={controller.payload}
              />
            ) : null}

            {controller.view === "tracks" ? (
              <TracksView
                onEnablePremium={controller.onEnablePremium}
                onOpenProblem={controller.onOpenProblem}
                onSetActiveFocus={controller.onSetActiveFocus}
                payload={controller.payload}
              />
            ) : null}

            {controller.view === "analytics" ? (
              <AnalyticsView payload={controller.payload} />
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
              <LibraryView
                filters={controller.filters}
                onEnablePremium={controller.onEnablePremium}
                onFilterChange={controller.setFilters}
                onOpenProblem={controller.onOpenProblem}
                onRefresh={controller.refresh}
                payload={controller.payload}
                rows={controller.rows}
              />
            ) : null}
          </Stack>
        </Box>
      </Stack>

      <PreV7BackupSnackbar />
    </DashboardFrame>
  );
}
