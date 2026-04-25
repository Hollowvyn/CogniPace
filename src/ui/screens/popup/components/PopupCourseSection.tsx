import CallMadeRounded from "@mui/icons-material/CallMadeRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import {ActiveCourseView, CourseQuestionView} from "../../../../domain/views";
import {
  FieldAssistRow,
  InlineStatusRegion,
  InsetSurface,
  ProgressTrack,
  SurfaceCard,
  SurfaceIconButton,
  SurfaceSectionLabel,
  SurfaceTooltip,
  ToneChip
} from "../../../components";
import {UiStatus} from "../../../state/useAppShellQuery";

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
      <SurfaceTooltip title="Open courses dashboard">
        <SurfaceIconButton
          aria-label="Open courses dashboard"
          onClick={props.onOpenDashboard}
          sx={{color: "primary.light"}}
        >
          <CallMadeRounded aria-hidden="true" fontSize="small"/>
        </SurfaceIconButton>
      </SurfaceTooltip>
    </Stack>
  );
}

function CourseStateCard(props: {
  action?: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  helper: string;
  onModeAction: () => void;
  onOpenDashboard: () => void;
  primaryActionLabel: string;
  status?: UiStatus;
  title: string;
}) {
  return (
    <SurfaceCard action={props.action} label="Active Course" title={props.title}>
      <Stack spacing={1.5}>
        {props.children}
        <FieldAssistRow>{props.helper}</FieldAssistRow>
        <InlineStatusRegion
          isError={props.status?.isError}
          message={props.status?.message}
        />
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
              minWidth: 0,
              fontSize: "0.92rem",
              fontWeight: 600,
              lineHeight: 1.22,
            }}
            noWrap
            translate="no"
          >
            {props.nextQuestion.title}
          </Typography>
          <SurfaceTooltip title="Continue path">
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
          </SurfaceTooltip>
        </Stack>
      </Stack>
    </InsetSurface>
  );
}

export function CoursePanelEmpty(props: {
  disabled?: boolean;
  onEnterFreestyle: () => void;
  onOpenDashboard: () => void;
  status?: UiStatus;
}) {
  return (
    <CourseStateCard
      disabled={props.disabled}
      helper="No guided track is active. Start freestyle for queue-only practice or open Courses to pick a path."
      onModeAction={props.onEnterFreestyle}
      onOpenDashboard={props.onOpenDashboard}
      primaryActionLabel="Start freestyle mode"
      status={props.status}
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
  status?: UiStatus;
}) {
  return (
    <CourseStateCard
      disabled={props.disabled}
      helper="This path is complete. Switch tracks in Courses or stay in freestyle to focus on due reviews."
      onModeAction={props.onEnterFreestyle}
      onOpenDashboard={props.onOpenDashboard}
      primaryActionLabel="Start freestyle mode"
      status={props.status}
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
  status?: UiStatus;
}) {
  return (
    <CourseStateCard
      disabled={props.disabled}
      helper="Freestyle keeps course context visible without advancing the guided path until you switch back."
      onModeAction={props.onReturnToStudyMode}
      onOpenDashboard={props.onOpenDashboard}
      primaryActionLabel="Start study mode"
      status={props.status}
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
  status?: UiStatus;
}) {
  return (
    <CourseStateCard
      action={<ToneChip label={`${props.course.completionPercent}%`} tone="accent"/>}
      disabled={props.disabled}
      helper="Study mode advances the active path. Use freestyle if you want queue-only review without changing course next."
      onModeAction={props.actions.onEnterFreestyle}
      onOpenDashboard={props.actions.onOpenDashboard}
      primaryActionLabel="Start freestyle mode"
      status={props.status}
      title={props.course.name}
    >
      <Stack spacing={1.25}>
        <Typography color="text.secondary" variant="body2">
          {props.course.description}
        </Typography>
        <ProgressTrack value={props.course.completionPercent}/>
        <Typography color="text.secondary" variant="body2">
          {props.course.completedQuestions}/{props.course.totalQuestions} questions traversed
        </Typography>
        <CourseNextInset
          courseId={props.course.id}
          nextQuestion={props.nextQuestion}
          onOpenProblem={props.actions.onOpenProblem}
        />
      </Stack>
    </CourseStateCard>
  );
}
