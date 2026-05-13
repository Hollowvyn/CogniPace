/** Dashboard screen composition that delegates all state to the dashboard controller. */
import { AnalyticsScreen as AnalyticsView } from "@features/analytics";
import { SettingsScreen as SettingsView } from "@features/settings";
import { TracksScreen as TracksView } from "@features/tracks";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardRail } from "./components/DashboardRail";
import { DashboardFrame } from "./components/DashboardSurface";
import { PreV7BackupSnackbar } from "./components/PreV7BackupSnackbar";
import { LibraryView } from "./tabs/library/LibraryView";
import { OverviewView } from "./tabs/overview/OverviewView";
import { useDashboardController } from "./useDashboardController";

export function DashboardApp() {
  const controller = useDashboardController();

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
