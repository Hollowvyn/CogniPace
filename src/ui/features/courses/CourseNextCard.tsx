/** Reusable “next in course” card shared by popup and dashboard surfaces. */
import Button, { ButtonProps } from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { getStudyPhaseLabel } from "../../../domain/fsrs/studyState";
import { CourseQuestionView } from "../../../domain/views";
import { SurfaceCard, ToneChip } from "../../components";
import {
  difficultyTone,
  labelForStatus,
} from "../../presentation/studyState";

export interface CourseNextCardProps {
  actionLabel?: string;
  activeCourseId?: string;
  buttonFullWidth?: boolean;
  buttonVariant?: ButtonProps["variant"];
  label?: string;
  onOpenProblem: (target: {
    slug: string;
    courseId?: string;
    chapterId?: string;
  }) => Promise<void> | void;
  view: CourseQuestionView;
}

export function CourseNextCard(props: CourseNextCardProps) {
  const {
    actionLabel = "Continue Path",
    activeCourseId,
    buttonFullWidth = false,
    buttonVariant = "outlined",
    label = "Next In Course",
    onOpenProblem,
    view,
  } = props;
  const phaseLabel = view.reviewPhase ? getStudyPhaseLabel(view.reviewPhase) : null;

  return (
    <SurfaceCard label={label} title={view.title}>
      <Stack spacing={1.5}>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          <ToneChip label={view.chapterTitle} />
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
              courseId: activeCourseId,
              chapterId: view.chapterId,
            });
          }}
          variant={buttonVariant}
        >
          {actionLabel}
        </Button>
      </Stack>
    </SurfaceCard>
  );
}
