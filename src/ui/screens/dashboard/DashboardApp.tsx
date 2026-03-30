/** Dashboard screen composition that delegates all state to the dashboard controller. */
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardRail } from "./components/DashboardRail";
import { useDashboardController } from "./useDashboardController";
import { AnalyticsView } from "./views/AnalyticsView";
import { CoursesView } from "./views/CoursesView";
import { LibraryView } from "./views/LibraryView";
import { OverviewView } from "./views/OverviewView";
import { SettingsView } from "./views/SettingsView";

export function DashboardApp() {
  const controller = useDashboardController();

  return (
    <Box sx={{ maxWidth: 1440, mx: "auto", p: 2.5 }}>
      <Stack direction={{ lg: "row", xs: "column" }} spacing={2}>
        <DashboardRail
          activeView={controller.view}
          onNavigate={controller.navigateToView}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack spacing={2}>
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
                onSubmitCourseForm={controller.onSubmitCourseForm}
                onSwitchCourse={controller.onSwitchCourse}
                onToggleMode={controller.onToggleMode}
                payload={controller.payload}
              />
            ) : null}

            {controller.view === "courses" ? (
              <CoursesView
                onOpenProblem={controller.onOpenProblem}
                onSetChapter={controller.onSetChapter}
                onSubmitCourseForm={controller.onSubmitCourseForm}
                onSwitchCourse={controller.onSwitchCourse}
                onToggleMode={controller.onToggleMode}
                payload={controller.payload}
              />
            ) : null}

            {controller.view === "analytics" ? (
              <AnalyticsView
                onSwitchCourse={controller.onSwitchCourse}
                payload={controller.payload}
              />
            ) : null}

            {controller.view === "settings" ? (
              <SettingsView
                onExportData={controller.onExportData}
                onImportData={controller.onImportData}
                onResetSettings={() => {
                  controller.setSettingsDraftState(null);
                }}
                onSaveSettings={() => {
                  void controller.onSaveSettings();
                }}
                onSetImportFile={controller.setImportFile}
                onUpdateSettings={controller.updateSettingsDraft}
                payload={controller.payload}
                settingsDraft={controller.draftSettings}
              />
            ) : null}

            {controller.view === "library" ? (
              <LibraryView
                filters={controller.filters}
                onFilterChange={controller.setFilters}
                onOpenProblem={controller.onOpenProblem}
                payload={controller.payload}
                rows={controller.rows}
              />
            ) : null}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
