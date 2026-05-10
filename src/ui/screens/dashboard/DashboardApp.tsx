/** Dashboard screen composition that delegates all state to the dashboard controller. */
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardRail } from "./components/DashboardRail";
import { DashboardFrame } from "./components/DashboardSurface";
import { PreV7BackupSnackbar } from "./components/PreV7BackupSnackbar";
import { AnalyticsView } from "./tabs/analytics/AnalyticsView";
import { LibraryView } from "./tabs/library/LibraryView";
import { OverviewView } from "./tabs/overview/OverviewView";
import { SettingsView } from "./tabs/settings/SettingsView";
import { TracksView } from "./tabs/tracks/TracksView";
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

            {controller.view === "settings" && controller.draftSettings ? (
              <SettingsView
                canDiscardSettings={controller.hasSettingsChanges}
                canResetSettingsToDefaults={!controller.isDefaultSettingsDraft}
                canSaveSettings={controller.hasSettingsChanges}
                importFile={controller.importFile}
                onDiscardSettings={controller.onDiscardSettings}
                onExportData={controller.onExportData}
                onImportData={controller.onImportData}
                onResetSettingsToDefaults={() => {
                  void controller.onResetSettingsToDefaults();
                }}
                onResetStudyHistory={() => {
                  void controller.onResetStudyHistory();
                }}
                onSaveSettings={() => {
                  void controller.onSaveSettings();
                }}
                onSetImportFile={controller.setImportFile}
                onUpdateSettings={controller.updateSettingsDraft}
                settingsDraft={controller.draftSettings}
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
