/** Persistent dashboard rail navigation for switching between dashboard screens. */
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import {alpha} from "@mui/material/styles";
import Typography from "@mui/material/Typography";

import {BrandMark, SurfaceSectionLabel} from "../../../components";
import {dashboardRoutes, DashboardView} from "../../../navigation/dashboardRoutes";
import {kineticTokens} from "../../../theme";

import {DashboardControlRow, DashboardRailPanel} from "./DashboardSurface";

export interface DashboardRailProps {
  activeView: DashboardView;
  onNavigate: (view: DashboardView) => void;
}

export function DashboardRail(props: DashboardRailProps) {
  return (
    <DashboardRailPanel>
      <Stack spacing={2}>
        <Stack alignItems="center" direction="row" spacing={1.25}>
          <BrandMark/>
          <Box>
            <Typography variant="h6">Kinetic Terminal</Typography>
            <Typography color="text.secondary" variant="body2">
              v1.0.4
            </Typography>
          </Box>
        </Stack>
        <Stack spacing={0.75}>
          <SurfaceSectionLabel>Navigate</SurfaceSectionLabel>
          {dashboardRoutes.map((route) => (
            <Button
              aria-current={props.activeView === route.view ? "page" : undefined}
              key={route.view}
              onClick={() => {
                props.onNavigate(route.view);
              }}
              sx={{
                borderColor:
                  props.activeView === route.view
                    ? alpha(kineticTokens.accentSoft, 0.72)
                    : alpha(kineticTokens.outlineStrong, 0.44),
                justifyContent: "flex-start",
                minHeight: 36,
                px: 1.25,
                width: "100%",
              }}
              variant={props.activeView === route.view ? "contained" : "outlined"}
            >
              {route.label}
            </Button>
          ))}
        </Stack>
        <DashboardControlRow>
          <Typography color="text.secondary" variant="body2">
            Spaced repetition control plane
          </Typography>
        </DashboardControlRow>
      </Stack>
    </DashboardRailPanel>
  );
}
