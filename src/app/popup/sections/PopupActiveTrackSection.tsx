import {
  FieldAssistRow,
  InlineStatusRegion,
  InsetSurface,
  ProgressTrack,
  SurfaceCard,
  SurfaceIconButton,
  SurfaceSectionLabel,
  SurfaceTooltip,
  ToneChip,
} from "@design-system/atoms";
import { cognipaceControlScale } from "@design-system/theme";
import { UiStatus } from "@features/app-shell";
import { ActiveTrackView, TrackQuestionView } from "@features/tracks";
import CallMadeRounded from "@mui/icons-material/CallMadeRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { popupSmallButtonSx } from "./popupStyles";

import type { ReactNode } from "react";

function TrackFooter(props: {
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
      <SurfaceTooltip title="Open tracks dashboard">
        <SurfaceIconButton
          aria-label="Open tracks dashboard"
          onClick={props.onOpenDashboard}
          sx={{ color: "primary.light" }}
        >
          <CallMadeRounded aria-hidden="true" fontSize="small" />
        </SurfaceIconButton>
      </SurfaceTooltip>
    </Stack>
  );
}

function TrackStateCard(props: {
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
    <SurfaceCard
      action={props.action}
      label="Active Track"
      title={props.title}
    >
      <Stack spacing={1.5}>
        {props.children}
        <FieldAssistRow>{props.helper}</FieldAssistRow>
        <InlineStatusRegion
          isError={props.status?.isError}
          message={props.status?.message}
        />
        <TrackFooter
          disabled={props.disabled}
          onModeAction={props.onModeAction}
          onOpenDashboard={props.onOpenDashboard}
          primaryActionLabel={props.primaryActionLabel}
        />
      </Stack>
    </SurfaceCard>
  );
}

function TrackNextInset(props: {
  courseId: string;
  nextQuestion: TrackQuestionView;
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
              sx={{
                color: "primary.light",
                height: cognipaceControlScale.compactPillMinHeight,
                width: cognipaceControlScale.compactPillMinWidth,
              }}
            >
              <ChevronRightRounded aria-hidden="true" fontSize="small" />
            </SurfaceIconButton>
          </SurfaceTooltip>
        </Stack>
      </Stack>
    </InsetSurface>
  );
}

export function TrackPanelEmpty(props: {
  disabled?: boolean;
  onEnterFreestyle: () => void;
  onOpenDashboard: () => void;
  status?: UiStatus;
}) {
  return (
    <TrackStateCard
      disabled={props.disabled}
      helper="No guided track is active. Start freestyle for queue-only practice or open Tracks to pick a path."
      onModeAction={props.onEnterFreestyle}
      onOpenDashboard={props.onOpenDashboard}
      primaryActionLabel="Start freestyle mode"
      status={props.status}
      title="No active track"
    >
      <Typography color="text.secondary" variant="body2">
        Choose a track in the dashboard to restore the guided path.
      </Typography>
    </TrackStateCard>
  );
}

export function TrackPanelLoading(props: {
  onOpenDashboard: () => void;
  status?: UiStatus;
}) {
  return (
    <SurfaceCard label="Active Track" title="Loading track">
      <Stack spacing={1.5}>
        <Typography color="text.secondary" variant="body2">
          Fetching track context.
        </Typography>
        <FieldAssistRow>Track data is loading.</FieldAssistRow>
        <InlineStatusRegion
          isError={props.status?.isError}
          message={props.status?.message}
        />
        <SurfaceTooltip title="Open tracks dashboard">
          <SurfaceIconButton
            aria-label="Open tracks dashboard"
            onClick={props.onOpenDashboard}
            sx={{ alignSelf: "flex-end", color: "primary.light" }}
          >
            <CallMadeRounded aria-hidden="true" fontSize="small" />
          </SurfaceIconButton>
        </SurfaceTooltip>
      </Stack>
    </SurfaceCard>
  );
}

export function TrackPanelCompleted(props: {
  trackName: string;
  disabled?: boolean;
  onEnterFreestyle: () => void;
  onOpenDashboard: () => void;
  status?: UiStatus;
}) {
  return (
    <TrackStateCard
      disabled={props.disabled}
      helper="This path is complete. Switch tracks in the dashboard or stay in freestyle to focus on due reviews."
      onModeAction={props.onEnterFreestyle}
      onOpenDashboard={props.onOpenDashboard}
      primaryActionLabel="Start freestyle mode"
      status={props.status}
      title={props.trackName}
    >
      <Typography color="text.secondary" variant="body2">
        Track complete. Switch tracks in the dashboard or stay focused on due
        reviews.
      </Typography>
    </TrackStateCard>
  );
}

export function TrackPanelFreestyle(props: {
  disabled?: boolean;
  onOpenDashboard: () => void;
  onReturnToStudyMode: () => void;
  status?: UiStatus;
}) {
  return (
    <TrackStateCard
      disabled={props.disabled}
      helper="Freestyle keeps track context visible without advancing the guided path until you switch back."
      onModeAction={props.onReturnToStudyMode}
      onOpenDashboard={props.onOpenDashboard}
      primaryActionLabel="Start study mode"
      status={props.status}
      title="You are in free style mode"
    >
      <Typography color="text.secondary" variant="body2">
        Start study mode to resume your guided track progression.
      </Typography>
    </TrackStateCard>
  );
}

export function TrackPanelStudyPlan(props: {
  actions: {
    onEnterFreestyle: () => void;
    onOpenDashboard: () => void;
    onOpenProblem: (target: {
      slug: string;
      courseId?: string;
      chapterId?: string;
    }) => Promise<void> | void;
  };
  track: ActiveTrackView;
  disabled?: boolean;
  nextQuestion: TrackQuestionView;
  status?: UiStatus;
}) {
  return (
    <TrackStateCard
      action={
        <ToneChip label={`${props.track.completionPercent}%`} tone="accent" />
      }
      disabled={props.disabled}
      helper="Study mode advances the active path. Use freestyle if you want queue-only review without changing track next."
      onModeAction={props.actions.onEnterFreestyle}
      onOpenDashboard={props.actions.onOpenDashboard}
      primaryActionLabel="Start freestyle mode"
      status={props.status}
      title={props.track.name}
    >
      <Stack spacing={1.25}>
        <Typography color="text.secondary" variant="body2">
          {props.track.description}
        </Typography>
        <ProgressTrack
          ariaLabel={`${props.track.name} completion`}
          value={props.track.completionPercent}
        />
        <Typography color="text.secondary" variant="body2">
          {props.track.completedQuestions}/{props.track.totalQuestions}{" "}
          questions traversed
        </Typography>
        <TrackNextInset
          courseId={props.track.id}
          nextQuestion={props.nextQuestion}
          onOpenProblem={props.actions.onOpenProblem}
        />
      </Stack>
    </TrackStateCard>
  );
}
