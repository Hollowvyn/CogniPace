/** Dashboard overview screen showing recommendation, queue, and active-course summary. */
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { AppShellPayload } from "../../../../domain/views";
import { MetricCard, SurfaceCard, ToneChip } from "../../../components";
import { CourseNextCard } from "../../../features/courses/CourseNextCard";
import { CourseProgressCard } from "../../../features/courses/CourseProgressCard";
import { QueuePreview } from "../../../features/queue/QueuePreview";
import { RecommendedProblemCard } from "../../../features/recommended/RecommendedProblemCard";
import { DashboardView } from "../../../navigation/dashboardRoutes";
import { CourseFormState } from "../../../presentation/courseIngest";
import { CourseIngestForm } from "../components/CourseIngestForm";
import { CourseRosterCard } from "../components/CourseRosterCard";

export interface OverviewViewProps {
  onOpenProblem: (target: {
    chapterId?: string;
    courseId?: string;
    slug: string;
  }) => Promise<void>;
  onSetView: (view: DashboardView) => void;
  onSubmitCourseForm: (state: CourseFormState) => Promise<boolean>;
  onSwitchCourse: (courseId: string) => Promise<void>;
  onToggleMode: () => Promise<void>;
  payload: AppShellPayload | null;
}

export function OverviewView(props: OverviewViewProps) {
  const course = props.payload?.activeCourse ?? null;
  const activeCourseId = course?.id;
  const nextQuestion = course?.nextQuestion ?? null;
  const recommended = props.payload?.popup.recommended ?? null;

  return (
    <Grid container spacing={2}>
      <Grid size={{ lg: 8, xs: 12 }}>
        <Stack spacing={2}>
          <RecommendedProblemCard
            onOpenProblem={props.onOpenProblem}
            recommended={recommended}
          />
          <Grid container spacing={1.5}>
            <Grid size={{ md: 4, xs: 12 }}>
              <MetricCard
                caption="Live pressure on the queue."
                label="Due Today"
                value={props.payload?.queue.dueCount ?? 0}
              />
            </Grid>
            <Grid size={{ md: 4, xs: 12 }}>
              <MetricCard
                caption="Consecutive review days."
                label="Day Streak"
                value={props.payload?.analytics.streakDays ?? 0}
              />
            </Grid>
            <Grid size={{ md: 4, xs: 12 }}>
              <MetricCard
                caption="Cards currently scheduled in FSRS review state."
                label="Review Cards"
                value={props.payload?.analytics.phaseCounts.Review ?? 0}
              />
            </Grid>
          </Grid>
          <CourseProgressCard course={course}>
            <Stack
              alignItems="center"
              direction={{ md: "row", xs: "column" }}
              justifyContent="space-between"
              spacing={1}
            >
              <Typography color="text.secondary" variant="body2">
                {course?.activeChapterTitle
                  ? `Current chapter: ${course.activeChapterTitle}`
                  : "Course complete"}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Study mode: {props.payload?.settings.studyMode ?? "studyPlan"}
              </Typography>
            </Stack>
            {nextQuestion ? (
              <Stack direction={{ md: "row", xs: "column" }} spacing={1}>
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
                <Button
                  onClick={() => {
                    props.onSetView("courses");
                  }}
                  variant="outlined"
                >
                  Open Course View
                </Button>
              </Stack>
            ) : null}
          </CourseProgressCard>
          {nextQuestion ? (
            <CourseNextCard
              activeCourseId={activeCourseId}
              buttonVariant="outlined"
              onOpenProblem={props.onOpenProblem}
              view={nextQuestion}
            />
          ) : null}
          <SurfaceCard
            action={
              <ToneChip
                label={`${props.payload?.queue.items.length ?? 0} items`}
              />
            }
            label="Today Queue"
            title="Live Intake"
          >
            <QueuePreview
              items={props.payload?.queue.items ?? []}
              onOpenProblem={props.onOpenProblem}
            />
          </SurfaceCard>
        </Stack>
      </Grid>

      <Grid size={{ lg: 4, xs: 12 }}>
        <Stack spacing={2}>
          <SurfaceCard label="Course Roster" title="Available Tracks">
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
          <SurfaceCard label="Quick Intake" title="Add Question">
            <CourseIngestForm
              onSubmit={props.onSubmitCourseForm}
              payload={props.payload}
            />
          </SurfaceCard>
          <SurfaceCard label="Protocol" title="Review Surface">
            <Stack spacing={1.5}>
              <Typography color="text.secondary" variant="body2">
                Study mode: {props.payload?.settings.studyMode ?? "studyPlan"} ·
                Order: {props.payload?.settings.reviewOrder ?? "dueFirst"} ·
                Timer + submit is fully manual.
              </Typography>
              <Stack direction={{ md: "row", xs: "column" }} spacing={1}>
                <Button
                  onClick={() => {
                    void props.onToggleMode();
                  }}
                  variant="outlined"
                >
                  Toggle Study Mode
                </Button>
                <Button
                  onClick={() => {
                    props.onSetView("settings");
                  }}
                  variant="text"
                >
                  Open Settings
                </Button>
              </Stack>
            </Stack>
          </SurfaceCard>
        </Stack>
      </Grid>
    </Grid>
  );
}
