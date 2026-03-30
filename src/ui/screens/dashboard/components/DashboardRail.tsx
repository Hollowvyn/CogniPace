/** Persistent dashboard rail navigation for switching between dashboard screens. */
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { BrandMark } from "../../../components";
import {
  dashboardRoutes,
  DashboardView,
} from "../../../navigation/dashboardRoutes";

export interface DashboardRailProps {
  activeView: DashboardView;
  onNavigate: (view: DashboardView) => void;
}

export function DashboardRail(props: DashboardRailProps) {
  return (
    <Paper
      sx={{
        alignSelf: "flex-start",
        minWidth: { lg: 216 },
        p: 2,
        position: { lg: "sticky" },
        top: { lg: 20 },
      }}
    >
      <Stack spacing={2}>
        <Stack alignItems="center" direction="row" spacing={1.25}>
          <BrandMark />
          <Box>
            <Typography variant="h6">Kinetic Terminal</Typography>
            <Typography color="text.secondary" variant="body2">
              v1.0.4
            </Typography>
          </Box>
        </Stack>
        <Stack spacing={1}>
          {dashboardRoutes.map((route) => (
            <Button
              key={route.view}
              onClick={() => {
                props.onNavigate(route.view);
              }}
              variant={
                props.activeView === route.view ? "contained" : "outlined"
              }
            >
              {route.label}
            </Button>
          ))}
        </Stack>
        <Divider />
        <Typography color="text.secondary" variant="body2">
          Spaced repetition control plane
        </Typography>
      </Stack>
    </Paper>
  );
}
