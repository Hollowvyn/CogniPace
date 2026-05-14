/**
 * Consolidated active-track surface for the dashboard's Overview tab.
 * Bundles what the v6 cards did separately (track progress + next-up
 * problem) into one cohesive card so the page doesn't repeat the same
 * track context twice.
 *
 * Information density sits between the popup (just title + next + CTA)
 * and the Tracks tab (full grouped table). One card with: header chip
 * for percent, track name, description, progress meter, current chapter
 * line, then the next-up problem inline with its CTA row underneath.
 */
import { ProgressTrack, SurfaceCard, ToneChip } from "@design-system/atoms";
import { difficultyTone } from "@features/problems";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { labelForStatus } from "../presentation/labels";

import type { ActiveTrackView, TrackQuestionView } from "../../domain/model";

export interface ActiveTrackOverviewCardProps {
  course: ActiveTrackView | null;
  studyMode: "studyPlan" | "freestyle";
  onOpenProblem: (target: {
    slug: string;
    trackId?: string;
    groupId?: string;
  }) => Promise<void> | void;
  onOpenTracks: () => void;
  onToggleStudyMode: () => void;
}

export function ActiveTrackOverviewCard(props: ActiveTrackOverviewCardProps) {
  const { course, studyMode, onOpenProblem, onOpenTracks, onToggleStudyMode } =
    props;

  if (!course) {
    return (
      <SurfaceCard label="Active Track" title="No active track">
        <Stack spacing={1.5}>
          <Typography color="text.secondary" variant="body2">
            Pick a track to focus your queue and unlock the guided next-up
            recommendation.
          </Typography>
          <Button onClick={onOpenTracks} variant="outlined" size="small">
            Browse tracks
          </Button>
        </Stack>
      </SurfaceCard>
    );
  }

  const nextQuestion = course.nextQuestion ?? null;

  return (
    <SurfaceCard
      action={
        <ToneChip label={`${course.completionPercent}%`} tone="accent" />
      }
      label="Active Track"
      title={course.name}
    >
      <Stack spacing={1.5}>
        {course.description ? (
          <Typography color="text.secondary" variant="body2">
            {course.description}
          </Typography>
        ) : null}

        <ProgressTrack
          ariaLabel={`${course.name} completion`}
          value={course.completionPercent}
        />

        <Stack
          direction={{ md: "row", xs: "column" }}
          justifyContent="space-between"
          spacing={0.5}
        >
          <Typography color="text.secondary" variant="body2">
            {course.completedQuestions}/{course.totalQuestions} questions
            traversed
            {course.activeChapterTitle
              ? ` · Current chapter: ${course.activeChapterTitle}`
              : ""}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Study mode: {studyMode}
          </Typography>
        </Stack>

        <Divider sx={{ my: 0.5 }} />

        {nextQuestion ? (
          <NextUpRow
            activeTrackId={course.id}
            view={nextQuestion}
            onOpenProblem={onOpenProblem}
            onOpenTracks={onOpenTracks}
          />
        ) : (
          <Stack spacing={0.5}>
            <Typography color="text.secondary" variant="body2">
              All questions in this chapter are reviewed. Pick another chapter
              in the Tracks tab.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button onClick={onOpenTracks} variant="outlined" size="small">
                Open Tracks
              </Button>
            </Stack>
          </Stack>
        )}

        {studyMode === "freestyle" ? (
          <Typography
            color="text.secondary"
            variant="caption"
            sx={{ fontStyle: "italic" }}
          >
            Freestyle keeps the track context visible without advancing the
            guided path.{" "}
            <Button
              onClick={onToggleStudyMode}
              size="small"
              variant="text"
              sx={{ p: 0, minWidth: 0, verticalAlign: "baseline" }}
            >
              Switch to study mode
            </Button>
          </Typography>
        ) : null}
      </Stack>
    </SurfaceCard>
  );
}

function NextUpRow({
  activeTrackId,
  view,
  onOpenProblem,
  onOpenTracks,
}: {
  activeTrackId: string;
  view: TrackQuestionView;
  onOpenProblem: ActiveTrackOverviewCardProps["onOpenProblem"];
  onOpenTracks: () => void;
}) {
  const phaseLabel = view.reviewPhase
    ? view.reviewPhase.toUpperCase()
    : null;

  return (
    <Stack spacing={1}>
      <Stack
        direction={{ md: "row", xs: "column" }}
        justifyContent="space-between"
        alignItems={{ md: "flex-start", xs: "flex-start" }}
        spacing={1}
      >
        <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            color="text.secondary"
            variant="overline"
            sx={{ letterSpacing: 0.4 }}
          >
            Next up
          </Typography>
          <Typography variant="subtitle1" fontWeight={500}>
            {view.title}
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.75}>
            <ToneChip label={view.chapterTitle} />
            <ToneChip
              label={view.difficulty}
              tone={difficultyTone(view.difficulty)}
            />
          </Stack>
          <Typography color="text.secondary" variant="caption">
            Path: {labelForStatus(view.status)}
            {phaseLabel ? ` · FSRS: ${phaseLabel}` : ""}
          </Typography>
        </Stack>
      </Stack>

      <Stack direction={{ md: "row", xs: "column" }} spacing={1}>
        <Button
          onClick={() => {
            void onOpenProblem({
              slug: view.slug,
              trackId: activeTrackId,
              groupId: view.groupId,
            });
          }}
          variant="contained"
        >
          Continue Path
        </Button>
        <Button onClick={onOpenTracks} variant="outlined">
          Open Tracks View
        </Button>
      </Stack>
    </Stack>
  );
}
