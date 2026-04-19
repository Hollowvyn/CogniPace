import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import {alpha} from "@mui/material/styles";
import Typography from "@mui/material/Typography";

import {kineticTokens} from "../../../theme";
import {ExpandedOverlayViewModel} from "../overlayPanel.types";

import {timerTextSx} from "./sharedStyles";

export function ExpandedOverlayTimerCard(
  props: {
    timer: ExpandedOverlayViewModel["timer"];
  }
) {
  return (
    <Paper
      sx={{
        backgroundColor: alpha(kineticTokens.backgroundAlt, 0.72),
        border: `1px solid ${alpha(kineticTokens.accent, 0.1)}`,
        borderRadius: 2.5,
        px: 1.5,
        py: 1.55,
      }}
    >
      <Stack spacing={1.4}>
        <Stack
          alignItems="flex-start"
          direction="row"
          justifyContent="space-between"
          spacing={1}
        >
          <Typography
            component="div"
            sx={{
              ...timerTextSx,
              fontSize: "2.4rem",
            }}
          >
            {props.timer.display}
          </Typography>
          <Stack alignItems="flex-end" spacing={0.25} sx={{pt: 0.25}}>
            <Typography color="text.secondary" variant="caption">
              Target time
            </Typography>
            <Typography variant="body1">{props.timer.targetDisplay}</Typography>
          </Stack>
        </Stack>

        <Stack direction="row" flexWrap="wrap" gap={0.85}>
          <Button
            disabled={!props.timer.canStart || props.timer.isRunning}
            onClick={props.timer.onStart}
            size="small"
            variant="contained"
          >
            Start
          </Button>
          <Button
            disabled={!props.timer.canPause || !props.timer.isRunning}
            onClick={props.timer.onPause}
            size="small"
            variant="outlined"
          >
            Pause
          </Button>
          <Button
            disabled={!props.timer.canReset}
            onClick={props.timer.onReset}
            size="small"
            startIcon={<RestartAltRounded fontSize="small"/>}
            variant="outlined"
          >
            Reset timer
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
