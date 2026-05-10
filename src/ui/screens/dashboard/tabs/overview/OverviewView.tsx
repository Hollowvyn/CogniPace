/** Dashboard overview screen — recommendation, metrics, queue, and a
 * consolidated active-track card (track progress + next-up problem in
 * a single card so the page doesn't repeat track context twice). */
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { AppShellPayload } from "../../../../../domain/views";
import { MetricCard, SurfaceCard, ToneChip } from "../../../../components";
import { QueuePreview } from "../../../../features/queue/QueuePreview";
import { RecommendedProblemCard } from "../../../../features/recommended/RecommendedProblemCard";
import { ActiveTrackOverviewCard } from "../../../../features/tracks/ActiveTrackOverviewCard";
import { DashboardView } from "../../../../navigation/dashboardRoutes";

export interface OverviewViewProps {
  onOpenProblem: (target: {
    chapterId?: string;
    courseId?: string;
    slug: string;
  }) => Promise<void>;
  onSetView: (view: DashboardView) => void;
  onToggleMode: () => Promise<void>;
  payload: AppShellPayload | null;
}

export function OverviewView(props: OverviewViewProps) {
  const course = props.payload?.activeTrack ?? null;
  const recommended = props.payload?.popup.recommended ?? null;

  return (
    <Grid container spacing={2}>
      <Grid size={{ lg: 8, xs: 12 }}>
        <Stack spacing={2}>
          <RecommendedProblemCard
            onOpenProblem={props.onOpenProblem}
            recommended={recommended}
          />
          <Grid container spacing={2}>
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
          <ActiveTrackOverviewCard
            course={course}
            studyMode={props.payload?.settings.studyMode ?? "studyPlan"}
            onOpenProblem={props.onOpenProblem}
            onOpenTracks={() => props.onSetView("tracks")}
            onToggleStudyMode={() => {
              void props.onToggleMode();
            }}
          />
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
          <SurfaceCard label="Protocol" title="Review Surface">
            <Stack spacing={2}>
              <Typography color="text.secondary" variant="body2">
                Study mode: {props.payload?.settings.studyMode ?? "studyPlan"} ·
                Order:{" "}
                {props.payload?.settings.memoryReview.reviewOrder ?? "dueFirst"}{" "}
                · Timer + submit is fully manual.
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
