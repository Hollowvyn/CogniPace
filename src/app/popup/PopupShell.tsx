/** Popup surface shell — composes the compact extension surface from
 *  feature-owned components. Driven by `usePopupShellVM` per the
 *  canonical Screen+VM pattern. */
import { InlineStatusRegion } from "@design-system/atoms";
import { cognipaceTokens } from "@design-system/theme";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";


import {
  TrackPanelCompleted,
  TrackPanelEmpty,
  TrackPanelFreestyle,
  TrackPanelLoading,
  TrackPanelStudyPlan,
} from "./sections/PopupActiveTrackSection";
import { PopupHeader } from "./sections/PopupHeader";
import { PopupMetricTile } from "./sections/PopupMetricTile";
import {
  RecommendationActive,
  RecommendationEmpty,
  RecommendationLoading,
} from "./sections/PopupRecommendationSection";
import { popupShellSx } from "./sections/popupStyles";
import { usePopupShellVM } from "./usePopupShellVM";

export function PopupShell() {
  const controller = usePopupShellVM();
  const recommendationStatus =
    controller.status.scope === "recommendation"
      ? controller.status
      : undefined;
  const trackStatus =
    controller.status.scope === "track" ? controller.status : undefined;
  const surfaceStatus =
    controller.status.scope === "surface" ? controller.status : undefined;

  const trackActions = {
    onEnterFreestyle: () => {
      void controller.setStudyMode("freestyle");
    },
    onOpenDashboard: controller.openTracksDashboard,
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

        <Box sx={{ p: 1.25 }}>
          <Stack spacing={1.2}>
            {surfaceStatus?.message ? (
              <InlineStatusRegion
                isError={surfaceStatus.isError}
                message={surfaceStatus.message}
              />
            ) : null}
            <Grid container spacing={1.25}>
              <Grid size={6}>
                <PopupMetricTile
                  accent={cognipaceTokens.danger}
                  label="Due Today"
                  value={
                    controller.isInitialLoading
                      ? "..."
                      : (controller.payload?.popup.dueCount ?? 0)
                  }
                />
              </Grid>
              <Grid size={6}>
                <PopupMetricTile
                  accent={cognipaceTokens.accentSoft}
                  label="Streak"
                  suffix="days"
                  value={
                    controller.isInitialLoading
                      ? "..."
                      : (controller.payload?.popup.streakDays ?? 0)
                  }
                />
              </Grid>
            </Grid>

            {controller.isInitialLoading ? (
              <RecommendationLoading status={recommendationStatus} />
            ) : controller.recommended ? (
              <RecommendationActive
                actions={recommendationActions}
                canShuffle={controller.hasMultipleRecommended}
                recommended={controller.recommended}
                status={recommendationStatus}
              />
            ) : (
              <RecommendationEmpty
                canShuffle={controller.hasMultipleRecommended}
                onShuffle={controller.shuffleRecommendation}
                status={recommendationStatus}
              />
            )}

            {controller.isInitialLoading ? (
              <TrackPanelLoading
                onOpenDashboard={trackActions.onOpenDashboard}
                status={trackStatus}
              />
            ) : controller.studyMode === "freestyle" ? (
              <TrackPanelFreestyle
                disabled={controller.isUpdatingStudyMode}
                onOpenDashboard={trackActions.onOpenDashboard}
                onReturnToStudyMode={trackActions.onReturnToStudyMode}
                status={trackStatus}
              />
            ) : !controller.activeTrackDetail ? (
              <TrackPanelEmpty
                disabled={controller.isUpdatingStudyMode}
                onEnterFreestyle={trackActions.onEnterFreestyle}
                onOpenDashboard={trackActions.onOpenDashboard}
                status={trackStatus}
              />
            ) : !controller.trackNext ? (
              <TrackPanelCompleted
                trackName={controller.activeTrackDetail.name}
                disabled={controller.isUpdatingStudyMode}
                onEnterFreestyle={trackActions.onEnterFreestyle}
                onOpenDashboard={trackActions.onOpenDashboard}
                status={trackStatus}
              />
            ) : (
              <TrackPanelStudyPlan
                actions={trackActions}
                track={controller.activeTrackDetail}
                disabled={controller.isUpdatingStudyMode}
                nextQuestion={controller.trackNext}
                status={trackStatus}
              />
            )}
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
