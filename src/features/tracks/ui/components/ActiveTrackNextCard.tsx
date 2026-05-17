/** Reusable "next in track" card shared by popup and overlay surfaces. */
import {SurfaceCard, ToneChip} from "@design-system/atoms";
import {difficultyTone} from "@features/problems";
import { getStudyStateSummary } from "@libs/fsrs/studyState";
import Button, {ButtonProps} from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import type { Problem } from "@features/problems";

export interface ActiveTrackNextCardProps {
  actionLabel?: string;
  trackId?: string;
  buttonFullWidth?: boolean;
  buttonVariant?: ButtonProps["variant"];
  compact?: boolean;
  label?: string;
  groupId?: string;
  groupName?: string;
  onOpenProblem: (target: {
    slug: string;
    trackId?: string;
    groupId?: string;
  }) => Promise<void> | void;
  problem: Problem;
}

export function ActiveTrackNextCard(props: ActiveTrackNextCardProps) {
  const {
    actionLabel = "Continue Path",
    buttonFullWidth = false,
    buttonVariant = "outlined",
    compact = false,
    groupId,
    groupName,
    label = "Next in track",
    onOpenProblem,
    problem,
    trackId,
  } = props;
  const summary = getStudyStateSummary(problem.studyState);
  const phaseLabel = summary.phase.toUpperCase();

  return (
    <SurfaceCard compact={compact} label={label} title={problem.title}>
      <Stack spacing={compact ? 1.15 : 1.5}>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {groupName ? <ToneChip label={groupName}/> : null}
          <ToneChip
            label={problem.difficulty}
            tone={difficultyTone(problem.difficulty)}
          />
        </Stack>
        <Typography color="text.secondary" variant="body2">
          FSRS: {phaseLabel}
        </Typography>
        <Button
          fullWidth={buttonFullWidth}
          onClick={() => {
            void onOpenProblem({
              slug: problem.slug,
              trackId,
              groupId,
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
