import CallMadeRounded from "@mui/icons-material/CallMadeRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import {alpha} from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import {ActiveCourseView, CourseQuestionView} from "../../../../domain/views";
import {kineticTokens} from "../../../theme";

import {popupIconButtonSx, popupPanelSx, popupSectionLabelSx, popupSmallButtonSx,} from "./popupStyles";

import type {ReactNode} from "react";

/** Shared layout for all course panels in the popup. */
export function CoursePanelLayout(props: {
  children: ReactNode;
  disabled?: boolean;
  onModeAction: () => void;
  onOpenDashboard: () => void;
  primaryActionLabel: string;
  title?: string;
}) {
  return (
    <Box
      sx={{
        ...popupPanelSx,
        height: 222,
        p: 1.35,
      }}
    >
      <Stack sx={{height: "100%"}}>
        <Stack spacing={1.2}>
          <Typography sx={popupSectionLabelSx}>
            {props.title ?? "Active Course"}
          </Typography>
          {props.children}
        </Stack>
        <Stack
          alignItems="center"
          direction="row"
          justifyContent="space-between"
          spacing={0.8}
          sx={{mt: "auto"}}
        >
          <Button
            disabled={props.disabled}
            onClick={props.onModeAction}
            size="small"
            sx={{
              ...popupSmallButtonSx,
              flex: 1,
              justifyContent: "center",
            }}
            variant="outlined"
          >
            {props.primaryActionLabel}
          </Button>
          <Tooltip title="Open courses dashboard">
            <IconButton
              aria-label="Open courses dashboard"
              onClick={props.onOpenDashboard}
              size="small"
              sx={popupIconButtonSx}
            >
              <CallMadeRounded aria-hidden="true" fontSize="small"/>
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Box>
  );
}

export function CoursePanelEmpty(props: {
  disabled?: boolean;
  onEnterFreestyle: () => void;
  onOpenDashboard: () => void;
}) {
  return (
    <CoursePanelLayout
      disabled={props.disabled}
      onModeAction={props.onEnterFreestyle}
      onOpenDashboard={props.onOpenDashboard}
      primaryActionLabel="Start freestyle mode"
    >
      <Stack spacing={0.7}>
        <Typography component="h2" variant="h6">
          No Active Course
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Choose a course in the dashboard to restore the guided path.
        </Typography>
      </Stack>
    </CoursePanelLayout>
  );
}

export function CoursePanelCompleted(props: {
  courseName: string;
  disabled?: boolean;
  onEnterFreestyle: () => void;
  onOpenDashboard: () => void;
}) {
  return (
    <CoursePanelLayout
      disabled={props.disabled}
      onModeAction={props.onEnterFreestyle}
      onOpenDashboard={props.onOpenDashboard}
      primaryActionLabel="Start freestyle mode"
    >
      <Stack spacing={0.7}>
        <Typography component="h2" variant="h6">
          {props.courseName}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Course complete. Switch tracks in the dashboard or stay focused on due
          reviews.
        </Typography>
      </Stack>
    </CoursePanelLayout>
  );
}

export function CoursePanelFreestyle(props: {
  disabled?: boolean;
  onOpenDashboard: () => void;
  onReturnToStudyMode: () => void;
}) {
  return (
    <CoursePanelLayout
      disabled={props.disabled}
      onModeAction={props.onReturnToStudyMode}
      onOpenDashboard={props.onOpenDashboard}
      primaryActionLabel="Start study mode"
    >
      <Stack spacing={0.7}>
        <Typography component="h2" variant="h6">
          You are in free style mode
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Start study mode to resume your guided course progression.
        </Typography>
      </Stack>
    </CoursePanelLayout>
  );
}

export function CoursePanelStudyPlan(props: {
  actions: {
    onEnterFreestyle: () => void;
    onOpenDashboard: () => void;
    onOpenProblem: (target: {
      slug: string;
      courseId?: string;
      chapterId?: string;
    }) => Promise<void> | void;
  };
  course: ActiveCourseView;
  disabled?: boolean;
  nextQuestion: CourseQuestionView;
}) {
  return (
    <CoursePanelLayout
      disabled={props.disabled}
      onModeAction={props.actions.onEnterFreestyle}
      onOpenDashboard={props.actions.onOpenDashboard}
      primaryActionLabel="Start freestyle mode"
    >
      <Stack spacing={1.2}>
        <Typography
          color="primary.light"
          component="h2"
          sx={{
            fontSize: "0.98rem",
            fontWeight: 700,
            lineHeight: 1.16,
          }}
        >
          {props.course.name}
        </Typography>

        <Stack spacing={0.6}>
          <Stack
            alignItems="center"
            direction="row"
            justifyContent="space-between"
            spacing={1}
          >
            <Typography sx={popupSectionLabelSx}>Progress</Typography>
            <Typography
              color="text.secondary"
              sx={{
                fontSize: "0.8rem",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 700,
              }}
            >
              {props.course.completionPercent}%
            </Typography>
          </Stack>
          <LinearProgress
            value={props.course.completionPercent}
            variant="determinate"
          />
        </Stack>

        <Box
          sx={{
            backgroundColor: alpha(kineticTokens.background, 0.34),
            border: `1px solid ${alpha(kineticTokens.outlineStrong, 0.22)}`,
            borderRadius: 1.2,
            p: 1.1,
          }}
        >
          <Stack spacing={0.6}>
            <Typography sx={popupSectionLabelSx}>Up Next</Typography>
            <Stack
              alignItems="center"
              direction="row"
              justifyContent="space-between"
              spacing={1}
            >
              <Typography
                sx={{
                  fontSize: "0.92rem",
                  fontWeight: 600,
                  lineHeight: 1.22,
                }}
                translate="no"
              >
                {props.nextQuestion.title}
              </Typography>
              <Tooltip title="Continue path">
                <IconButton
                  aria-label="Continue path"
                  onClick={() => {
                    void props.actions.onOpenProblem({
                      chapterId: props.nextQuestion.chapterId,
                      courseId: props.course.id,
                      slug: props.nextQuestion.slug,
                    });
                  }}
                  size="small"
                  sx={{
                    ...popupIconButtonSx,
                    borderColor: alpha(kineticTokens.accent, 0.42),
                    color: kineticTokens.accent,
                    height: 28,
                    width: 28,
                  }}
                >
                  <ChevronRightRounded aria-hidden="true" fontSize="small"/>
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>
      </Stack>
    </CoursePanelLayout>
  );
}
