/** Popup screen composition for the compact extension surface. */
import ShuffleRounded from "@mui/icons-material/ShuffleRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import {StatusBanner, SurfaceCard} from "../../components";
import {CourseNextCard} from "../../features/courses/CourseNextCard";
import {CourseProgressCard} from "../../features/courses/CourseProgressCard";
import {RecommendedProblemCard} from "../../features/recommended/RecommendedProblemCard";

import {PopupActions} from "./components/PopupActions";
import {PopupHeader} from "./components/PopupHeader";
import {usePopupController} from "./usePopupController";

export function PopupApp() {
  const controller = usePopupController();

  return (
    <Box
      sx={{
        height: 500,
        maxHeight: 500,
        overflowY: "auto",
        p: 1.25,
        scrollbarGutter: "stable",
        width: 380,
      }}
    >
      <Stack spacing={1.25}>
        <PopupHeader
          onOpenSettings={controller.onOpenSettings}
          onRefresh={() => {
            void controller.refresh(true);
          }}
        />

        <Grid container spacing={1}>
          <Grid size={6}>
            <SurfaceCard compact>
              <Stack spacing={0.5}>
                <Typography color="text.secondary" variant="overline">
                  Items Due
                </Typography>
                <Typography variant="h4">
                  {controller.payload?.popup.dueCount ?? 0}
                </Typography>
              </Stack>
            </SurfaceCard>
          </Grid>
          <Grid size={6}>
            <SurfaceCard compact>
              <Stack spacing={0.5}>
                <Typography color="text.secondary" variant="overline">
                  Streak
                </Typography>
                <Typography variant="h4">
                  {controller.payload?.popup.streakDays ?? 0}
                </Typography>
              </Stack>
            </SurfaceCard>
          </Grid>
        </Grid>

        <RecommendedProblemCard
          buttonFullWidth
          onOpenProblem={controller.onOpenProblem}
          recommended={controller.recommended}
        />
        {controller.hasMultipleRecommended ? (
          <Stack alignItems="flex-end">
            <Tooltip title="Shuffle recommendation">
              <IconButton
                aria-label="Shuffle recommendation"
                onClick={controller.shuffleRecommendation}
                size="small"
              >
                <ShuffleRounded fontSize="small"/>
              </IconButton>
            </Tooltip>
          </Stack>
        ) : null}

        {!controller.activeCourse ? (
          <SurfaceCard label="Next In Course" title="No active course">
            <Stack spacing={1.25}>
              <Typography color="text.secondary" variant="body2">
                Choose an active course in the dashboard to restore the guided
                path.
              </Typography>
              <Button fullWidth onClick={() => controller.onOpenDashboard()} variant="outlined">
                Open Dashboard
              </Button>
            </Stack>
          </SurfaceCard>
        ) : !controller.courseNext ? (
          <SurfaceCard
            label="Next In Course"
            title={controller.activeCourse.name}
          >
            <Stack spacing={1.25}>
              <Typography color="text.secondary" variant="body2">
                This course is fully traversed. Use the dashboard to switch tracks
                or focus on due reviews.
              </Typography>
              <Button fullWidth onClick={() => controller.onOpenDashboard()} variant="outlined">
                Open Dashboard
              </Button>
            </Stack>
          </SurfaceCard>
        ) : (
          <CourseNextCard
            activeCourseId={controller.activeCourse.id}
            buttonFullWidth
            onOpenProblem={controller.onOpenProblem}
            view={controller.courseNext}
          />
        )}

        <CourseProgressCard
          course={controller.activeCourse}
          emptyCopy="Choose an active course in the dashboard to restore the guided path."
          emptyTitle="No active course"
          label="Active Track"
        />

        <PopupActions
          onOpenDashboard={() => {
            controller.onOpenDashboard();
          }}
          onToggleStudyMode={controller.onToggleStudyMode}
          studyMode={controller.payload?.settings.studyMode}
        />

        <Divider/>
        <StatusBanner
          isError={controller.status.isError}
          message={controller.status.message}
        />
      </Stack>
    </Box>
  );
}
