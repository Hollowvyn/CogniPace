/** Dashboard overview — recommendation, metrics, queue, and active-track card.
 *  Driven by `useOverviewVM` per the canonical Screen+VM pattern. */
import { MetricCard, SurfaceCard, ToneChip } from "@design-system/atoms";
import { RecommendedProblemCard } from "@features/problems";
import { QueuePreview } from "@features/queue";
import { ActiveTrackOverviewCard } from "@features/tracks";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { useOverviewVM, UseOverviewVMInput } from "../hooks/useOverviewVM";

export type OverviewScreenProps = UseOverviewVMInput;

export function OverviewScreen(props: OverviewScreenProps) {
  const model = useOverviewVM(props);

  return (
    <Grid container spacing={2}>
      <Grid size={{ lg: 8, xs: 12 }}>
        <Stack spacing={2}>
          <RecommendedProblemCard
            onOpenProblem={model.onOpenProblem}
            recommended={model.recommended}
          />
          <Grid container spacing={2}>
            <Grid size={{ md: 4, xs: 12 }}>
              <MetricCard
                caption="Live pressure on the queue."
                label="Due Today"
                value={model.dueCount}
              />
            </Grid>
            <Grid size={{ md: 4, xs: 12 }}>
              <MetricCard
                caption="Consecutive review days."
                label="Day Streak"
                value={model.streakDays}
              />
            </Grid>
            <Grid size={{ md: 4, xs: 12 }}>
              <MetricCard
                caption="Cards currently scheduled in FSRS review state."
                label="Review Cards"
                value={model.reviewCardCount}
              />
            </Grid>
          </Grid>
          <ActiveTrackOverviewCard
            course={model.activeTrack}
            studyMode={model.studyMode}
            onOpenProblem={model.onOpenProblem}
            onOpenTracks={model.onGoToTracks}
            onToggleStudyMode={() => {
              void model.onToggleMode();
            }}
          />
          <SurfaceCard
            action={<ToneChip label={`${model.queueItems.length} items`} />}
            label="Today Queue"
            title="Live Intake"
          >
            <QueuePreview
              items={model.queueItems}
              onOpenProblem={model.onOpenProblem}
            />
          </SurfaceCard>
        </Stack>
      </Grid>

      <Grid size={{ lg: 4, xs: 12 }}>
        <Stack spacing={2}>
          <SurfaceCard label="Protocol" title="Review Surface">
            <Stack spacing={2}>
              <Typography color="text.secondary" variant="body2">
                Study mode: {model.studyMode} · Order: {model.reviewOrder} ·
                Timer + submit is fully manual.
              </Typography>
              <Stack direction={{ md: "row", xs: "column" }} spacing={1}>
                <Button
                  onClick={() => {
                    void model.onToggleMode();
                  }}
                  variant="outlined"
                >
                  Toggle Study Mode
                </Button>
                <Button onClick={model.onGoToSettings} variant="text">
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
