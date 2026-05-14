import {InsetSurface, NumericDisplay} from "@design-system/atoms";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import {ExpandedOverlayViewModel} from "../overlayPanel.types";

export function ExpandedOverlayTimerCard(
  props: {
    timer: ExpandedOverlayViewModel["timer"];
  }
) {
  return (
    <InsetSurface sx={{px: 1.5, py: 1.55}} tone="accent">
      <Stack spacing={1.4}>
        <Stack
          alignItems="flex-start"
          direction="row"
          justifyContent="space-between"
          spacing={1}
        >
          <NumericDisplay
            sx={{
              fontSize: "2.4rem",
              letterSpacing: "-0.06em",
            }}
          >
            {props.timer.display}
          </NumericDisplay>
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
    </InsetSurface>
  );
}
