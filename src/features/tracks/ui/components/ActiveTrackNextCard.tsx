/** Reusable "next in track" card shared by popup and overlay surfaces. */
import {SurfaceCard, ToneChip} from "@design-system/atoms";
import {difficultyTone} from "@features/problems";
import Button, {ButtonProps} from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import {labelForStatus} from "../presentation/labels";

import type {TrackQuestionView} from "../../domain/model";

export interface ActiveTrackNextCardProps {
  actionLabel?: string;
  activeTrackId?: string;
  buttonFullWidth?: boolean;
  buttonVariant?: ButtonProps["variant"];
  compact?: boolean;
  label?: string;
  onOpenProblem: (target: {
    slug: string;
    trackId?: string;
    groupId?: string;
  }) => Promise<void> | void;
  view: TrackQuestionView;
}

export function ActiveTrackNextCard(props: ActiveTrackNextCardProps) {
  const {
    actionLabel = "Continue Path",
    activeTrackId,
    buttonFullWidth = false,
    buttonVariant = "outlined",
    compact = false,
    label = "Next in track",
    onOpenProblem,
    view,
  } = props;
  const phaseLabel = view.reviewPhase ? view.reviewPhase.toUpperCase() : null;

  return (
    <SurfaceCard compact={compact} label={label} title={view.title}>
      <Stack spacing={compact ? 1.15 : 1.5}>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          <ToneChip label={view.chapterTitle}/>
          <ToneChip
            label={view.difficulty}
            tone={difficultyTone(view.difficulty)}
          />
        </Stack>
        <Typography color="text.secondary" variant="body2">
          Path: {labelForStatus(view.status)}
          {phaseLabel ? ` · FSRS: ${phaseLabel}` : ""}
        </Typography>
        <Button
          fullWidth={buttonFullWidth}
          onClick={() => {
            void onOpenProblem({
              slug: view.slug,
              trackId: activeTrackId,
              groupId: view.groupId,
            });
          }}
          size={compact ? "small" : "medium"}
          variant={buttonVariant}
        >
          {actionLabel}
        </Button>
      </Stack>
    </SurfaceCard>
  );
}
