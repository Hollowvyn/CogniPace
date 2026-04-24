import CallMadeRounded from "@mui/icons-material/CallMadeRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import {ActiveCourseView, CourseQuestionView} from "../../../../domain/views";
import {InsetSurface, SurfaceCard, SurfaceIconButton, SurfaceSectionLabel,} from "../../../components";
import {CourseProgressCard} from "../../../features/courses/CourseProgressCard";

import {popupSmallButtonSx} from "./popupStyles";

import type {ReactNode} from "react";

function CourseFooter(props: {
  disabled?: boolean;
  onModeAction: () => void;
  onOpenDashboard: () => void;
  primaryActionLabel: string;
}) {
  return (
    <Stack
      alignItems="center"
      direction="row"
      justifyContent="space-between"
      spacing={0.8}
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
        <SurfaceIconButton
          aria-label="Open courses dashboard"
          onClick={props.onOpenDashboard}
          sx={{color: "primary.light"}}
        >
          <CallMadeRounded aria-hidden="true" fontSize="small"/>
        </SurfaceIconButton>
      </Tooltip>
    </Stack>
  );
}

function CourseStateCard(props: {
  children: ReactNode;
  disabled?: boolean;
  onModeAction: () => void;
  onOpenDashboard: () => void;
  primaryActionLabel: string;
  title: string;
}) {
  return (
    <SurfaceCard label="Active Course" title={props.title}>
      <Stack spacing={1.5}>
        {props.children}
        <CourseFooter
          disabled={props.disabled}
          onModeAction={props.onModeAction}
          onOpenDashboard={props.onOpenDashboard}
          primaryActionLabel={props.primaryActionLabel}
        />
      </Stack>
    </SurfaceCard>
  );
}

function CourseNextInset(props: {
  courseId: string;
  nextQuestion: CourseQuestionView;
  onOpenProblem: (target: {
    slug: string;
    courseId?: string;
    chapterId?: string;
  }) => Promise<void> | void;
}) {
  return (
    <InsetSurface>
      <Stack spacing={0.7}>
        <SurfaceSectionLabel>Up Next</SurfaceSectionLabel>
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
            <SurfaceIconButton
              aria-label="Continue path"
              onClick={() => {
                void props.onOpenProblem({
                  chapterId: props.nextQuestion.chapterId,
                  courseId: props.courseId,
                  slug: props.nextQuestion.slug,
                });
              }}
              sx={{color: "primary.light", height: 28, width: 28}}
            >
              <ChevronRightRounded aria-hidden="true" fontSize="small"/>
            </SurfaceIconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </InsetSurface>
  );
}

export function CoursePanelEmpty(props: {
  disabled?: boolean;
  onEnterFreestyle: () => void;
  onOpenDashboard: () => void;
}) {
  return (
    <CourseStateCard
      disabled={props.disabled}
      onModeAction={props.onEnterFreestyle}
      onOpenDashboard={props.onOpenDashboard}
      primaryActionLabel="Start freestyle mode"
      title="No Active Course"
    >
      <Typography color="text.secondary" variant="body2">
        Choose a course in the dashboard to restore the guided path.
      </Typography>
    </CourseStateCard>
  );
}

export function CoursePanelCompleted(props: {
  courseName: string;
  disabled?: boolean;
  onEnterFreestyle: () => void;
  onOpenDashboard: () => void;
}) {
  return (
    <CourseStateCard
      disabled={props.disabled}
      onModeAction={props.onEnterFreestyle}
      onOpenDashboard={props.onOpenDashboard}
      primaryActionLabel="Start freestyle mode"
      title={props.courseName}
    >
      <Typography color="text.secondary" variant="body2">
        Course complete. Switch tracks in the dashboard or stay focused on due
        reviews.
      </Typography>
    </CourseStateCard>
  );
}

export function CoursePanelFreestyle(props: {
  disabled?: boolean;
  onOpenDashboard: () => void;
  onReturnToStudyMode: () => void;
}) {
  return (
    <CourseStateCard
      disabled={props.disabled}
      onModeAction={props.onReturnToStudyMode}
      onOpenDashboard={props.onOpenDashboard}
      primaryActionLabel="Start study mode"
      title="You are in free style mode"
    >
      <Typography color="text.secondary" variant="body2">
        Start study mode to resume your guided course progression.
      </Typography>
    </CourseStateCard>
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
    <CourseProgressCard
      course={props.course}
      label="Active Course"
      showProgressChip={false}
    >
      <Stack spacing={1.2}>
        <CourseNextInset
          courseId={props.course.id}
          nextQuestion={props.nextQuestion}
          onOpenProblem={props.actions.onOpenProblem}
        />
        <CourseFooter
          disabled={props.disabled}
          onModeAction={props.actions.onEnterFreestyle}
          onOpenDashboard={props.actions.onOpenDashboard}
          primaryActionLabel="Start freestyle mode"
        />
      </Stack>
    </CourseProgressCard>
  );
}
