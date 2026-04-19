/** Dashboard page header with route metadata and transient status messaging. */
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import {StatusBanner} from "../../../components";
import {DashboardRoute} from "../../../navigation/dashboardRoutes";
import {UiStatus} from "../../../state/useAppShellQuery";

export interface DashboardHeaderProps {
  onOpenSettings: () => void;
  onRefresh: () => void;
  route: DashboardRoute;
  status: UiStatus;
}

export function DashboardHeader(props: DashboardHeaderProps) {
  return (
    <Paper sx={{p: 2.25}}>
      <Stack spacing={2}>
        <Stack
          alignItems={{md: "center", xs: "flex-start"}}
          direction={{md: "row", xs: "column"}}
          justifyContent="space-between"
          spacing={2}
        >
          <Box>
            <Typography color="text.secondary" variant="overline">
              {props.route.title.toUpperCase()}
            </Typography>
            <Typography variant="h4">{props.route.title}</Typography>
            <Typography color="text.secondary" variant="body2">
              {props.route.copy}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh dashboard">
              <IconButton
                aria-label="Refresh dashboard"
                onClick={props.onRefresh}
              >
                <RefreshRounded/>
              </IconButton>
            </Tooltip>
            <Tooltip title="Open settings">
              <IconButton
                aria-label="Open settings"
                onClick={props.onOpenSettings}
              >
                <SettingsRounded/>
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        <StatusBanner isError={props.status.isError} message={props.status.message}/>
      </Stack>
    </Paper>
  );
}
