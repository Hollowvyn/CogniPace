/** Reusable course-question status table for dashboard course views. */
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

import { ActiveCourseView } from "../../../domain/views";
import { ToneChip } from "../../components";
import {
  difficultyTone,
  formatDisplayDate,
  formatStudyPhase,
  labelForStatus,
  questionStatusTone,
} from "../../presentation/studyState";

export interface ProblemStatusTableProps {
  course: ActiveCourseView | null;
  onOpenProblem: (target: {
    slug: string;
    courseId?: string;
    chapterId?: string;
  }) => Promise<void> | void;
}

export function ProblemStatusTable(props: ProblemStatusTableProps) {
  if (!props.course) {
    return (
      <Typography color="text.secondary" variant="body2">
        No course data loaded.
      </Typography>
    );
  }

  const questions = props.course.chapters.flatMap(
    (chapter) => chapter.questions
  );

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Question</TableCell>
            <TableCell>Chapter</TableCell>
            <TableCell>Difficulty</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Next Review</TableCell>
            <TableCell>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {questions.map((question) => (
            <TableRow key={question.slug}>
              <TableCell>
                <Typography variant="subtitle2">{question.title}</Typography>
                <Typography color="text.secondary" variant="body2">
                  {question.slug}
                </Typography>
              </TableCell>
              <TableCell>{question.chapterTitle}</TableCell>
              <TableCell>
                <ToneChip
                  label={question.difficulty}
                  tone={difficultyTone(question.difficulty)}
                />
              </TableCell>
              <TableCell>
                <Stack spacing={0.5}>
                  <ToneChip
                    label={labelForStatus(question.status)}
                    tone={questionStatusTone(question.status)}
                  />
                  {question.reviewPhase ? (
                    <Typography color="text.secondary" variant="body2">
                      FSRS {formatStudyPhase(question.reviewPhase)}
                    </Typography>
                  ) : null}
                </Stack>
              </TableCell>
              <TableCell>{formatDisplayDate(question.nextReviewAt)}</TableCell>
              <TableCell>
                <Button
                  onClick={() => {
                    void props.onOpenProblem({
                      slug: question.slug,
                      courseId: props.course?.id,
                      chapterId: question.chapterId,
                    });
                  }}
                  variant="outlined"
                >
                  Launch
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
