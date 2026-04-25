/** Reusable recommendation card shared by popup and dashboard surfaces. */
import Button, {ButtonProps} from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {ReactNode} from "react";

import {RecommendedProblemView} from "../../../domain/views";
import {SurfaceCard, ToneChip} from "../../components";
import {difficultyTone, formatDisplayDate, recommendedTone,} from "../../presentation/studyState";

export interface RecommendedProblemCardProps {
  buttonFullWidth?: boolean;
  buttonLabel?: string;
  buttonVariant?: ButtonProps["variant"];
  compact?: boolean;
  emptyCopy?: string;
  emptyTitle?: string;
  headerAction?: ReactNode;
  helper?: ReactNode;
  onOpenProblem: (
    target: Pick<RecommendedProblemView, "slug">
  ) => Promise<void> | void;
  recommended: RecommendedProblemView | null;
  showNextReviewDate?: boolean;
}

export function RecommendedProblemCard(props: RecommendedProblemCardProps) {
  const {
    buttonFullWidth = false,
    buttonLabel = "Open Problem",
    buttonVariant = "contained",
    compact = false,
    emptyCopy = "No review pressure right now. Shift to the active course to keep the streak moving.",
    emptyTitle = "Queue clear",
    headerAction,
    helper,
    onOpenProblem,
    recommended,
    showNextReviewDate = true,
  } = props;

  if (!recommended) {
    return (
      <SurfaceCard compact={compact} label="Recommended Now" title={emptyTitle}>
        <Stack spacing={compact ? 1 : 1.2}>
          <Typography color="text.secondary" variant="body2">
            {emptyCopy}
          </Typography>
          {helper}
        </Stack>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard
      compact={compact}
      action={
        headerAction ?? (
          <ToneChip
            label={recommended.difficulty}
            tone={difficultyTone(recommended.difficulty)}
          />
        )
      }
      label="Recommended Now"
      title={recommended.title}
    >
      <Stack spacing={compact ? 1.15 : 1.5}>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          <ToneChip
            label={recommended.reason}
            tone={recommendedTone(recommended.reason)}
          />
          {recommended.alsoCourseNext ? (
            <ToneChip label="Also next in course" tone="success"/>
          ) : null}
        </Stack>
        {showNextReviewDate ? (
          <Typography color="text.secondary" variant="body2">
            {recommended.nextReviewAt
              ? `Next review day: ${formatDisplayDate(recommended.nextReviewAt)}`
              : "Highest leverage problem in the queue."}
          </Typography>
        ) : null}
        <Button
          fullWidth={buttonFullWidth}
          onClick={() => {
            void onOpenProblem({slug: recommended.slug});
          }}
          size={compact ? "small" : "medium"}
          variant={buttonVariant}
        >
          {buttonLabel}
        </Button>
        {helper}
      </Stack>
    </SurfaceCard>
  );
}
