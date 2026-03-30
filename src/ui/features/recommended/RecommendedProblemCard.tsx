/** Reusable recommendation card shared by popup and dashboard surfaces. */
import Button, { ButtonProps } from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { RecommendedProblemView } from "../../../domain/views";
import { SurfaceCard, ToneChip } from "../../components";
import {
  difficultyTone,
  formatDisplayDate,
  recommendedTone,
} from "../../presentation/studyState";

export interface RecommendedProblemCardProps {
  buttonFullWidth?: boolean;
  buttonLabel?: string;
  buttonVariant?: ButtonProps["variant"];
  emptyCopy?: string;
  emptyTitle?: string;
  onOpenProblem: (
    target: Pick<RecommendedProblemView, "slug">
  ) => Promise<void> | void;
  recommended: RecommendedProblemView | null;
}

export function RecommendedProblemCard(props: RecommendedProblemCardProps) {
  const {
    buttonFullWidth = false,
    buttonLabel = "Open Problem",
    buttonVariant = "contained",
    emptyCopy = "No review pressure right now. Shift to the active course to keep the streak moving.",
    emptyTitle = "Queue clear",
    onOpenProblem,
    recommended,
  } = props;

  if (!recommended) {
    return (
      <SurfaceCard label="Recommended Now" title={emptyTitle}>
        <Typography color="text.secondary" variant="body2">
          {emptyCopy}
        </Typography>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard
      action={
        <ToneChip
          label={recommended.difficulty}
          tone={difficultyTone(recommended.difficulty)}
        />
      }
      label="Recommended Now"
      title={recommended.title}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          <ToneChip
            label={recommended.reason}
            tone={recommendedTone(recommended.reason)}
          />
          {recommended.alsoCourseNext ? (
            <ToneChip label="Also next in course" tone="success" />
          ) : null}
        </Stack>
        <Typography color="text.secondary" variant="body2">
          {recommended.nextReviewAt
            ? `Next review day: ${formatDisplayDate(recommended.nextReviewAt)}`
            : "Highest leverage problem in the queue."}
        </Typography>
        <Button
          fullWidth={buttonFullWidth}
          onClick={() => {
            void onOpenProblem({ slug: recommended.slug });
          }}
          variant={buttonVariant}
        >
          {buttonLabel}
        </Button>
      </Stack>
    </SurfaceCard>
  );
}
