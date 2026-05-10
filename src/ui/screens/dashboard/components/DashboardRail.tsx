/** Persistent dashboard rail navigation for switching between dashboard screens. */
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import {
  BrandMark,
  SurfaceControlRow,
  SurfaceNavButton,
  SurfaceSectionLabel,
} from "../../../components";
import {
  dashboardRoutes,
  DashboardView,
} from "../../../navigation/dashboardRoutes";

import { DashboardRailPanel } from "./DashboardSurface";

export interface DashboardRailProps {
  activeView: DashboardView;
  onNavigate: (view: DashboardView) => void;
}

export function DashboardRail(props: DashboardRailProps) {
  return (
    <DashboardRailPanel>
      <Stack spacing={2}>
        <BrandMark subtitle="v1.0.4" />
        <Stack spacing={1}>
          <SurfaceSectionLabel>Navigate</SurfaceSectionLabel>
          {dashboardRoutes.map((route) => (
            <SurfaceNavButton
              active={props.activeView === route.view}
              key={route.view}
              onClick={() => {
                props.onNavigate(route.view);
              }}
            >
              {route.label}
            </SurfaceNavButton>
          ))}
        </Stack>
        <SurfaceControlRow>
          <Typography color="text.secondary" variant="body2">
            Spaced repetition control plane
          </Typography>
        </SurfaceControlRow>
      </Stack>
    </DashboardRailPanel>
  );
}
