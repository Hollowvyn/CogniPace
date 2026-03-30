/** Reusable course progress summary card shared across popup and dashboard surfaces. */
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ReactNode } from "react";

import { ActiveCourseView, CourseCardView } from "../../../domain/views";
import { ProgressTrack, SurfaceCard, ToneChip } from "../../components";

export interface CourseProgressCardProps {
  action?: ReactNode;
  children?: ReactNode;
  course: ActiveCourseView | CourseCardView | null;
  emptyCopy?: string;
  emptyTitle?: string;
  label?: string;
}

export function CourseProgressCard(props: CourseProgressCardProps) {
  const {
    action,
    children,
    course,
    emptyCopy = "Set an active course to enable guided traversal.",
    emptyTitle = "No active course",
    label = "Active Course",
  } = props;

  if (!course) {
    return (
      <SurfaceCard label={label} title={emptyTitle}>
        <Typography color="text.secondary" variant="body2">
          {emptyCopy}
        </Typography>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard
      action={action ?? <ToneChip label={`${course.completionPercent}%`} tone="accent" />}
      label={label}
      title={course.name}
    >
      <Stack spacing={1.5}>
        <Typography color="text.secondary" variant="body2">
          {course.description}
        </Typography>
        <ProgressTrack value={course.completionPercent} />
        <Typography color="text.secondary" variant="body2">
          {course.completedQuestions}/{course.totalQuestions} questions traversed
        </Typography>
        {children}
      </Stack>
    </SurfaceCard>
  );
}
