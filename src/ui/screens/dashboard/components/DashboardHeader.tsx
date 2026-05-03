/** Dashboard page header with route metadata and transient status messaging. */
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import {
  InlineStatusRegion,
  SurfaceIconButton,
  SurfaceTooltip,
} from "../../../components";
import {DashboardRoute} from "../../../navigation/dashboardRoutes";
import {UiStatus} from "../../../state/useAppShellQuery";

import {DashboardHeaderPanel} from "./DashboardSurface";

export interface DashboardHeaderProps {
  onOpenSettings: () => void;
  onRefresh: () => void;
  route: DashboardRoute;
  status: UiStatus;
}

export function DashboardHeader(props: DashboardHeaderProps) {
  return (
    <DashboardHeaderPanel>
      <Stack spacing={2}>
        <Stack
          alignItems={{md: "center", xs: "flex-start"}}
          direction={{md: "row", xs: "column"}}
          justifyContent="space-between"
          spacing={2}
        >
          <Box sx={{maxWidth: "100%", minWidth: 0}}>
            <Typography color="text.secondary" variant="overline">
              {props.route.label.toUpperCase()}
            </Typography>
            <Typography variant="h4">{props.route.title}</Typography>
            <Typography
              color="text.secondary"
              sx={{overflowWrap: "anywhere"}}
              variant="body2"
            >
              {props.route.copy}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <SurfaceTooltip title="Refresh dashboard">
              <SurfaceIconButton
                aria-label="Refresh dashboard"
                onClick={props.onRefresh}
              >
                <RefreshRounded aria-hidden="true" fontSize="small"/>
              </SurfaceIconButton>
            </SurfaceTooltip>
            <SurfaceTooltip title="Open settings">
              <SurfaceIconButton
                aria-label="Open settings"
                onClick={props.onOpenSettings}
              >
                <SettingsRounded aria-hidden="true" fontSize="small"/>
              </SurfaceIconButton>
            </SurfaceTooltip>
          </Stack>
        </Stack>
        <InlineStatusRegion
          isError={props.status.isError}
          message={props.status.message}
        />
      </Stack>
    </DashboardHeaderPanel>
  );
}
