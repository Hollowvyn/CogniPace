import CancelRounded from "@mui/icons-material/CancelRounded";
import KeyboardArrowUpRounded from "@mui/icons-material/KeyboardArrowUpRounded";
import PauseRounded from "@mui/icons-material/PauseRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import {alpha} from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import {kineticTokens} from "../../../theme";
import {CollapsedOverlayViewModel} from "../overlayPanel.types";

import {outlinedChromeIconButtonSx, timerTextSx} from "./sharedStyles";

export function CollapsedOverlayPanel(
  props: {
    model: CollapsedOverlayViewModel;
  }
) {
  return (
    <Paper
      sx={{
        border: (theme) => `1px solid ${theme.palette.divider}`,
        borderRadius: 2.25,
        overflow: "hidden",
        width: 408,
      }}
    >
      <Stack spacing={1.1} sx={{p: 1.75}}>
        <Stack
          alignItems="center"
          direction="row"
          justifyContent="space-between"
          spacing={1.75}
        >
          <Stack alignItems="center" direction="row" spacing={0.9}>
            <Tooltip title="Expand overlay">
              <IconButton
                aria-label="Expand overlay"
                onClick={props.model.actions.onToggleCollapse}
                size="small"
                sx={outlinedChromeIconButtonSx}
              >
                <KeyboardArrowUpRounded fontSize="small"/>
              </IconButton>
            </Tooltip>
            <Box
              sx={{
                alignSelf: "stretch",
                backgroundColor: (theme) => theme.palette.divider,
                borderRadius: 999,
                width: "1px",
              }}
            />
            <Typography
              component="div"
              sx={{
                ...timerTextSx,
                flexShrink: 0,
                fontSize: "2rem",
              }}
            >
              {props.model.timer.display}
            </Typography>
            <Tooltip title={props.model.timer.startLabel}>
              <span>
                <IconButton
                  aria-label={props.model.timer.startLabel}
                  disabled={!props.model.timer.canStart}
                  onClick={
                    props.model.timer.isRunning
                      ? props.model.timer.onPause
                      : props.model.timer.onStart
                  }
                  size="small"
                  sx={{
                    backgroundColor: alpha(kineticTokens.accent, 0.12),
                    border: `1px solid ${alpha(kineticTokens.accentSoft, 0.2)}`,
                    color: "primary.light",
                    "&:hover": {
                      backgroundColor: alpha(kineticTokens.accent, 0.2),
                    },
                  }}
                >
                  {props.model.timer.isRunning ? (
                    <PauseRounded fontSize="small"/>
                  ) : (
                    <PlayArrowRounded fontSize="small"/>
                  )}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Restart timer">
              <span>
                <IconButton
                  aria-label="Restart timer"
                  disabled={!props.model.timer.canReset}
                  onClick={props.model.timer.onReset}
                  size="small"
                  sx={outlinedChromeIconButtonSx}
                >
                  <RestartAltRounded fontSize="small"/>
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
          <Stack alignItems="center" direction="row" spacing={0.75}>
            <Button
              disabled={!props.model.actions.canSubmit}
              onClick={props.model.actions.onSubmit}
              size="small"
              variant="contained"
            >
              Submit
            </Button>
            <Tooltip title="Fail review">
              <span>
                <IconButton
                  aria-label="Fail review"
                  disabled={!props.model.actions.canFail}
                  onClick={props.model.actions.onFail}
                  size="small"
                  sx={{
                    backgroundColor: kineticTokens.danger,
                    borderRadius: 1.1,
                    boxShadow: `0 12px 24px ${alpha(kineticTokens.danger, 0.18)}`,
                    color: kineticTokens.background,
                    height: 34,
                    width: 34,
                    "&:hover": {
                      backgroundColor: "#ffc3bb",
                    },
                  }}
                >
                  <CancelRounded fontSize="small"/>
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}
