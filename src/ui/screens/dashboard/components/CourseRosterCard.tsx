/** Compact course summary card used in dashboard course roster lists. */
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { CourseCardView } from "../../../../domain/views";
import { ProgressTrack, ToneChip } from "../../../components";

export interface CourseRosterCardProps {
  course: CourseCardView;
  onSwitchCourse: (courseId: string) => Promise<void> | void;
}

export function CourseRosterCard(props: CourseRosterCardProps) {
  const course = props.course;

  return (
    <Paper sx={{ p: 1.75 }}>
      <Stack spacing={1.25}>
        <Stack
          alignItems="center"
          direction="row"
          justifyContent="space-between"
          spacing={1}
        >
          <Box>
            <Typography color="text.secondary" variant="overline">
              {course.sourceSet}
            </Typography>
            <Typography variant="h6">{course.name}</Typography>
          </Box>
          {course.active ? <ToneChip label="Active" tone="accent" /> : null}
        </Stack>
        <Typography color="text.secondary" variant="body2">
          {course.description}
        </Typography>
        <ProgressTrack value={course.completionPercent} />
        <Stack
          alignItems={{ md: "center", xs: "flex-start" }}
          direction={{ md: "row", xs: "column" }}
          justifyContent="space-between"
          spacing={1}
        >
          <Typography color="text.secondary" variant="body2">
            {course.completedQuestions}/{course.totalQuestions} traversed
          </Typography>
          <ToneChip label={`${course.completionPercent}%`} />
        </Stack>
        <Stack
          alignItems={{ md: "center", xs: "flex-start" }}
          direction={{ md: "row", xs: "column" }}
          justifyContent="space-between"
          spacing={1}
        >
          <Typography color="text.secondary" variant="body2">
            {course.nextQuestionTitle
              ? `Next: ${course.nextQuestionTitle}`
              : "Course complete"}
          </Typography>
          <Button
            onClick={() => {
              void props.onSwitchCourse(course.id);
            }}
            variant="outlined"
          >
            {course.active ? "Viewing" : "Set Active"}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
