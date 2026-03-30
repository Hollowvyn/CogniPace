/** Dashboard course-management screen for active path traversal and intake. */
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { AppShellPayload } from "../../../../domain/views";
import { MetricCard, SurfaceCard } from "../../../components";
import { CourseNextCard } from "../../../features/courses/CourseNextCard";
import { CourseProgressCard } from "../../../features/courses/CourseProgressCard";
import { ProblemStatusTable } from "../../../features/questions/ProblemStatusTable";
import { CourseFormState } from "../../../presentation/courseIngest";
import { CourseIngestForm } from "../components/CourseIngestForm";
import { CourseRosterCard } from "../components/CourseRosterCard";

export interface CoursesViewProps {
  onOpenProblem: (target: {
    chapterId?: string;
    courseId?: string;
    slug: string;
  }) => Promise<void>;
  onSetChapter: (courseId: string, chapterId: string) => Promise<void>;
  onSubmitCourseForm: (state: CourseFormState) => Promise<boolean>;
  onSwitchCourse: (courseId: string) => Promise<void>;
  onToggleMode: () => Promise<void>;
  payload: AppShellPayload | null;
}

export function CoursesView(props: CoursesViewProps) {
  const course = props.payload?.activeCourse ?? null;
  const activeCourseId = course?.id;
  const nextQuestion = course?.nextQuestion ?? null;

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid size={{ lg: 8, xs: 12 }}>
          <CourseProgressCard
            course={course}
            emptyTitle="Course Offline"
            label={course?.sourceSet ?? "No active course"}
          >
            {course ? (
              <>
                <Grid container spacing={1.5}>
                  <Grid size={{ md: 4, xs: 12 }}>
                    <MetricCard
                      caption={`${course.completedChapters} completed`}
                      label="Chapters"
                      value={course.totalChapters}
                    />
                  </Grid>
                  <Grid size={{ md: 4, xs: 12 }}>
                    <MetricCard
                      caption={`${course.completedQuestions} traversed`}
                      label="Questions"
                      value={course.totalQuestions}
                    />
                  </Grid>
                  <Grid size={{ md: 4, xs: 12 }}>
                    <MetricCard
                      caption="Pending review cards"
                      label="Due In Track"
                      value={course.dueCount}
                    />
                  </Grid>
                </Grid>
                <Stack direction={{ md: "row", xs: "column" }} spacing={1}>
                  {nextQuestion ? (
                    <Button
                      onClick={() => {
                        void props.onOpenProblem({
                          slug: nextQuestion.slug,
                          courseId: activeCourseId,
                          chapterId: nextQuestion.chapterId,
                        });
                      }}
                      variant="contained"
                    >
                      Continue Path
                    </Button>
                  ) : (
                    <Button disabled variant="outlined">
                      Path Complete
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      void props.onToggleMode();
                    }}
                    variant="outlined"
                  >
                    Toggle Study Mode
                  </Button>
                </Stack>
              </>
            ) : null}
          </CourseProgressCard>
          {nextQuestion ? (
            <CourseNextCard
              activeCourseId={activeCourseId}
              buttonVariant="contained"
              onOpenProblem={props.onOpenProblem}
              view={nextQuestion}
            />
          ) : null}
        </Grid>
        <Grid size={{ lg: 4, xs: 12 }}>
          <SurfaceCard label="Ingest Question" title="Append To Active Chapter">
            <CourseIngestForm
              onSubmit={props.onSubmitCourseForm}
              payload={props.payload}
            />
          </SurfaceCard>
        </Grid>
      </Grid>

      <SurfaceCard label="Course Roster" title="Switch Active Track">
        <Stack spacing={1.25}>
          {(props.payload?.courses ?? []).map((courseCard) => (
            <CourseRosterCard
              course={courseCard}
              key={courseCard.id}
              onSwitchCourse={props.onSwitchCourse}
            />
          ))}
        </Stack>
      </SurfaceCard>

      <SurfaceCard label="Chapter Map" title="Operational Sequence">
        {course ? (
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {course.chapters.map((chapter) => (
              <Button
                key={chapter.id}
                onClick={() => {
                  if (activeCourseId) {
                    void props.onSetChapter(activeCourseId, chapter.id);
                  }
                }}
                variant={
                  chapter.id === course.activeChapterId ? "contained" : "outlined"
                }
              >
                {chapter.title} · {chapter.completedQuestions}/
                {chapter.totalQuestions}
              </Button>
            ))}
          </Stack>
        ) : (
          <Typography color="text.secondary" variant="body2">
            No active course selected.
          </Typography>
        )}
      </SurfaceCard>

      <SurfaceCard label="Question Matrix" title="Current Path State">
        <ProblemStatusTable course={course} onOpenProblem={props.onOpenProblem} />
      </SurfaceCard>
    </Stack>
  );
}
