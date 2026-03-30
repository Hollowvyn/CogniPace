/** Dashboard analytics screen for retention, due forecast, and weakest-item signals. */
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

import { AppShellPayload } from "../../../../domain/views";
import { MetricCard, SurfaceCard } from "../../../components";
import { CourseRosterCard } from "../components/CourseRosterCard";

export interface AnalyticsViewProps {
  onSwitchCourse: (courseId: string) => Promise<void>;
  payload: AppShellPayload | null;
}

export function AnalyticsView(props: AnalyticsViewProps) {
  const payload = props.payload;
  const weakest = payload?.analytics.weakestProblems ?? [];
  const dueByDay = payload?.analytics.dueByDay ?? [];
  const maxDue = Math.max(1, ...dueByDay.map((point) => point.count));

  return (
    <Stack spacing={2}>
      <Grid container spacing={1.5}>
        <Grid size={{ md: 4, xs: 12 }}>
          <MetricCard
            caption="Consecutive active review days."
            label="Streak"
            value={payload?.analytics.streakDays ?? 0}
          />
        </Grid>
        <Grid size={{ md: 4, xs: 12 }}>
          <MetricCard
            caption="Scheduler events logged across the library."
            label="Total Reviews"
            value={payload?.analytics.totalReviews ?? 0}
          />
        </Grid>
        <Grid size={{ md: 4, xs: 12 }}>
          <MetricCard
            caption="Recent ratings at Good or Easy."
            label="Retention Proxy"
            value={`${Math.round((payload?.analytics.retentionProxy ?? 0) * 100)}%`}
          />
        </Grid>
      </Grid>

      <SurfaceCard label="FSRS" title="Scheduler Signals">
        <Grid container spacing={2}>
          <Grid size={{ md: 6, xs: 12 }}>
            <Paper sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Typography variant="h6">Average Retention Rate</Typography>
                <Typography color="text.secondary" variant="body2">
                  Percentage of recent reviews rated Good or Easy. Target is roughly
                  85-90%.
                </Typography>
                <Box>
                  <Typography variant="h3">
                    {Math.round((payload?.analytics.retentionProxy ?? 0) * 100)}%
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
          <Grid size={{ md: 6, xs: 12 }}>
            <Paper sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Typography variant="h6">Difficulty Spread</Typography>
                <Typography color="text.secondary" variant="body2">
                  Higher FSRS difficulty means a problem is harder to retain.
                </Typography>
                <Stack spacing={1}>
                  {weakest.slice(0, 5).map((problem) => (
                    <Box key={problem.slug}>
                      <Stack
                        alignItems="center"
                        direction="row"
                        justifyContent="space-between"
                        spacing={1}
                      >
                        <Typography noWrap variant="body2">
                          {problem.title}
                        </Typography>
                        <Typography color="text.secondary" variant="body2">
                          {problem.difficulty.toFixed(1)}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        sx={{ mt: 1 }}
                        value={(problem.difficulty / 10) * 100}
                        variant="determinate"
                      />
                    </Box>
                  ))}
                  {weakest.length === 0 ? (
                    <Typography color="text.secondary" variant="body2">
                      No problem data yet.
                    </Typography>
                  ) : null}
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </SurfaceCard>

      <SurfaceCard label="Due Forecast" title="Next 14 Days">
        <Grid container spacing={1.5}>
          {dueByDay.map((point) => (
            <Grid key={point.date} size={{ md: 6, xl: 4, xs: 12 }}>
              <Paper sx={{ p: 2 }}>
                <Stack spacing={1.25}>
                  <Stack
                    alignItems="center"
                    direction="row"
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Typography color="text.secondary" variant="overline">
                      {point.date}
                    </Typography>
                    <Typography variant="h6">{point.count}</Typography>
                  </Stack>
                  <LinearProgress
                    value={(point.count / maxDue) * 100}
                    variant="determinate"
                  />
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </SurfaceCard>

      <Grid container spacing={2}>
        <Grid size={{ lg: 8, xs: 12 }}>
          <SurfaceCard label="Weakest Problems" title="Highest Lapse Pressure">
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Problem</TableCell>
                    <TableCell>Lapses</TableCell>
                    <TableCell>FSRS Difficulty</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {weakest.map((problem) => (
                    <TableRow key={problem.slug}>
                      <TableCell>{problem.title}</TableCell>
                      <TableCell>{problem.lapses}</TableCell>
                      <TableCell>{problem.difficulty.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SurfaceCard>
        </Grid>
        <Grid size={{ lg: 4, xs: 12 }}>
          <SurfaceCard label="Course Completion" title="Track Status">
            <Stack spacing={1.25}>
              {(payload?.courses ?? []).map((course) => (
                <CourseRosterCard
                  course={course}
                  key={course.id}
                  onSwitchCourse={props.onSwitchCourse}
                />
              ))}
            </Stack>
          </SurfaceCard>
        </Grid>
      </Grid>
    </Stack>
  );
}
