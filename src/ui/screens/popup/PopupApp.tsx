/** Popup screen composition for the compact extension surface. */
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import {alpha} from "@mui/material/styles";

import {kineticTokens} from "../../theme";

import {
  CoursePanelCompleted,
  CoursePanelEmpty,
  CoursePanelFreestyle,
  CoursePanelStudyPlan,
} from "./components/PopupCourseSection";
import {PopupHeader} from "./components/PopupHeader";
import {PopupMetricTile} from "./components/PopupMetricTile";
import {RecommendationActive, RecommendationEmpty,} from "./components/PopupRecommendationSection";
import {popupShellSx} from "./components/popupStyles";
import {usePopupController} from "./usePopupController";

export function PopupApp() {
  const controller = usePopupController();

  const courseActions = {
    onEnterFreestyle: () => {
      void controller.setStudyMode("freestyle");
    },
    onOpenDashboard: controller.openCoursesDashboard,
    onOpenProblem: controller.onOpenProblem,
    onReturnToStudyMode: () => {
      void controller.setStudyMode("studyPlan");
    },
  };

  const recommendationActions = {
    onOpenProblem: controller.onOpenProblem,
    onShuffle: controller.shuffleRecommendation,
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        p: 1.1,
        width: 380,
      }}
    >
      <Paper sx={popupShellSx}>
        <PopupHeader
          onOpenSettings={controller.onOpenSettings}
          onRefresh={() => {
            void controller.refresh(true);
          }}
        />

        <Box sx={{p: 1.25}}>
          <Stack spacing={1.2}>
            <Grid container spacing={1.25}>
              <Grid size={6}>
                <PopupMetricTile
                  accent={kineticTokens.danger}
                  label="Due Today"
                  value={controller.payload?.popup.dueCount ?? 0}
                />
              </Grid>
              <Grid size={6}>
                <PopupMetricTile
                  accent={kineticTokens.accentSoft}
                  label="Streak"
                  suffix="days"
                  value={controller.payload?.popup.streakDays ?? 0}
                />
              </Grid>
            </Grid>

            {controller.recommended ? (
              <RecommendationActive
                actions={recommendationActions}
                canShuffle={controller.hasMultipleRecommended}
                recommended={controller.recommended}
              />
            ) : (
              <RecommendationEmpty
                canShuffle={controller.hasMultipleRecommended}
                onShuffle={controller.shuffleRecommendation}
              />
            )}

            {controller.studyMode === "freestyle" ? (
              <CoursePanelFreestyle
                disabled={controller.isUpdatingStudyMode}
                onOpenDashboard={courseActions.onOpenDashboard}
                onReturnToStudyMode={courseActions.onReturnToStudyMode}
              />
            ) : !controller.activeCourseDetail ? (
              <CoursePanelEmpty
                disabled={controller.isUpdatingStudyMode}
                onEnterFreestyle={courseActions.onEnterFreestyle}
                onOpenDashboard={courseActions.onOpenDashboard}
              />
            ) : !controller.courseNext ? (
              <CoursePanelCompleted
                courseName={controller.activeCourseDetail.name}
                disabled={controller.isUpdatingStudyMode}
                onEnterFreestyle={courseActions.onEnterFreestyle}
                onOpenDashboard={courseActions.onOpenDashboard}
              />
            ) : (
              <CoursePanelStudyPlan
                actions={courseActions}
                course={controller.activeCourseDetail}
                disabled={controller.isUpdatingStudyMode}
                nextQuestion={controller.courseNext}
              />
            )}
          </Stack>
        </Box>
      </Paper>

      {controller.status.message ? (
        <Alert
          aria-live="polite"
          severity={controller.status.isError ? "error" : "info"}
          sx={{
            border: `1px solid ${alpha(kineticTokens.outlineStrong, 0.28)}`,
            borderRadius: 1.4,
          }}
          variant="filled"
        >
          {controller.status.message}
        </Alert>
      ) : null}
    </Box>
  );
}
