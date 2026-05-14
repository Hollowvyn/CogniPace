/** Analytics screen — read-only summary of FSRS signals, weak items,
 *  and due forecast. Driven by `useAnalyticsVM` per the canonical
 *  Screen+VM pattern. */
import {
  InsetSurface,
  MetricCard,
  SurfaceCard,
  SurfaceTableContainer,
} from "@design-system/atoms";
import { AppShellPayload } from "@features/app-shell";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

import { useAnalyticsVM } from "../hooks/useAnalyticsVM";

export interface AnalyticsScreenProps {
  payload: AppShellPayload | null;
}

export function AnalyticsScreen(props: AnalyticsScreenProps) {
  const model = useAnalyticsVM(props.payload);

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid size={{ md: 4, xs: 12 }}>
          <MetricCard
            caption="Consecutive active review days."
            label="Streak"
            value={model.streakDays}
          />
        </Grid>
        <Grid size={{ md: 4, xs: 12 }}>
          <MetricCard
            caption="Scheduler events logged across the library."
            label="Total Reviews"
            value={model.totalReviews}
          />
        </Grid>
        <Grid size={{ md: 4, xs: 12 }}>
          <MetricCard
            caption="Recent ratings at Good or Easy."
            label="Retention Proxy"
            value={`${model.retentionProxyPct}%`}
          />
        </Grid>
      </Grid>

      <SurfaceCard label="FSRS" title="Scheduler Signals">
        <Grid container spacing={2}>
          <Grid size={{ md: 6, xs: 12 }}>
            <InsetSurface sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Typography variant="h6">Average Retention Rate</Typography>
                <Typography color="text.secondary" variant="body2">
                  Percentage of recent reviews rated Good or Easy. Target is
                  roughly 85-90%.
                </Typography>
                <Box>
                  <Typography variant="h3">
                    {model.retentionProxyPct}%
                  </Typography>
                </Box>
              </Stack>
            </InsetSurface>
          </Grid>
          <Grid size={{ md: 6, xs: 12 }}>
            <InsetSurface sx={{ p: 2 }}>
              <Stack spacing={2}>
                <Typography variant="h6">Difficulty Spread</Typography>
                <Typography color="text.secondary" variant="body2">
                  Higher FSRS difficulty means a problem is harder to retain.
                </Typography>
                <Stack spacing={1}>
                  {model.weakest.slice(0, 5).map((problem) => (
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
                  {model.weakest.length === 0 ? (
                    <Typography color="text.secondary" variant="body2">
                      No problem data yet.
                    </Typography>
                  ) : null}
                </Stack>
              </Stack>
            </InsetSurface>
          </Grid>
        </Grid>
      </SurfaceCard>

      <SurfaceCard label="Due Forecast" title="Next 14 Days">
        <Grid container spacing={2}>
          {model.dueByDay.map((point) => (
            <Grid key={point.date} size={{ md: 6, xl: 4, xs: 12 }}>
              <InsetSurface sx={{ p: 2 }}>
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
                    value={(point.count / model.maxDuePerDay) * 100}
                    variant="determinate"
                  />
                </Stack>
              </InsetSurface>
            </Grid>
          ))}
        </Grid>
      </SurfaceCard>

      <SurfaceCard label="Weakest Problems" title="Highest Lapse Pressure">
        <SurfaceTableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Problem</TableCell>
                <TableCell>Lapses</TableCell>
                <TableCell>FSRS Difficulty</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {model.weakest.map((problem) => (
                <TableRow key={problem.slug}>
                  <TableCell>{problem.title}</TableCell>
                  <TableCell>{problem.lapses}</TableCell>
                  <TableCell>{problem.difficulty.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {model.weakest.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography color="text.secondary" variant="body2">
                      No weak-problem data yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </SurfaceTableContainer>
      </SurfaceCard>
    </Stack>
  );
}
