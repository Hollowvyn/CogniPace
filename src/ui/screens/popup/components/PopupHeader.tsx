import RefreshRounded from "@mui/icons-material/RefreshRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import {BrandMark} from "../../../components";

export interface PopupHeaderProps {
  onOpenSettings: () => void;
  onRefresh: () => void;
}

export function PopupHeader(props: PopupHeaderProps) {
  return (
    <Stack
      alignItems="center"
      direction="row"
      justifyContent="space-between"
      spacing={1}
    >
      <Stack alignItems="center" direction="row" spacing={1}>
        <BrandMark/>
        <Typography variant="subtitle1">CogniPace</Typography>
      </Stack>
      <Stack direction="row" spacing={0.5}>
        <Tooltip title="Refresh popup">
          <IconButton aria-label="Refresh popup" onClick={props.onRefresh} size="small">
            <RefreshRounded fontSize="small"/>
          </IconButton>
        </Tooltip>
        <Tooltip title="Open settings">
          <IconButton aria-label="Open settings" onClick={props.onOpenSettings} size="small">
            <SettingsRounded fontSize="small"/>
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  );
}
