import RefreshRounded from "@mui/icons-material/RefreshRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import {alpha} from "@mui/material/styles";
import Typography from "@mui/material/Typography";

import {BrandMark, SurfaceIconButton, SurfaceTooltip} from "../../../components";
import {kineticTokens} from "../../../theme";

export interface PopupHeaderProps {
  onOpenSettings: () => void;
  onRefresh: () => void;
}

export function PopupHeader(props: PopupHeaderProps) {
  return (
    <Box
      component="header"
      sx={{
        borderBottom: `1px solid ${alpha(kineticTokens.outlineStrong, 0.24)}`,
        px: 1.4,
        py: 1.2,
      }}
    >
      <Stack
        alignItems="center"
        direction="row"
        justifyContent="space-between"
        spacing={1}
      >
        <Box sx={{width: 32}}>
          <BrandMark/>
        </Box>
        <Typography
          component="h1"
          sx={{
            color: kineticTokens.accent,
            flex: 1,
            fontFamily:
              '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif',
            fontSize: "1.02rem",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            textAlign: "center",
          }}
          translate="no"
        >
          CogniPace
        </Typography>
        <Stack direction="row" spacing={0.45} sx={{minWidth: 64}}>
          <SurfaceTooltip title="Refresh popup">
            <SurfaceIconButton
              aria-label="Refresh popup"
              onClick={props.onRefresh}
              sx={{color: "primary.light"}}
            >
              <RefreshRounded aria-hidden="true" fontSize="small"/>
            </SurfaceIconButton>
          </SurfaceTooltip>
          <SurfaceTooltip title="Open settings">
            <SurfaceIconButton
              aria-label="Open settings"
              onClick={props.onOpenSettings}
              sx={{color: "primary.light"}}
            >
              <SettingsRounded aria-hidden="true" fontSize="small"/>
            </SurfaceIconButton>
          </SurfaceTooltip>
        </Stack>
      </Stack>
    </Box>
  );
}
