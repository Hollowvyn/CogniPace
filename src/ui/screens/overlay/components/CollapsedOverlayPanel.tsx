import CancelRounded from "@mui/icons-material/CancelRounded";
import KeyboardArrowUpRounded from "@mui/icons-material/KeyboardArrowUpRounded";
import PauseRounded from "@mui/icons-material/PauseRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import VisibilityOffRounded from "@mui/icons-material/VisibilityOffRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import {alpha} from "@mui/material/styles";

import {FieldAssistRow, NumericDisplay, SurfaceIconButton, SurfaceTooltip} from "../../../components";
import {cognipaceTokens} from "../../../theme";
import {CollapsedOverlayViewModel} from "../overlayPanel.types";

import {OverlayFeedbackSurface} from "./OverlayFeedbackSurface";

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
            <SurfaceTooltip title="Expand overlay">
              <SurfaceIconButton
                aria-label="Expand overlay"
                onClick={props.model.actions.onExpand}
              >
                <KeyboardArrowUpRounded fontSize="small"/>
              </SurfaceIconButton>
            </SurfaceTooltip>
            <SurfaceTooltip title="Hide overlay">
              <SurfaceIconButton
                aria-label="Hide overlay"
                onClick={props.model.actions.onHide}
              >
                <VisibilityOffRounded fontSize="small"/>
              </SurfaceIconButton>
            </SurfaceTooltip>
            <Box
              sx={{
                alignSelf: "stretch",
                backgroundColor: (theme) => theme.palette.divider,
                borderRadius: 999,
                width: "1px",
              }}
            />
            <NumericDisplay
              sx={{
                flexShrink: 0,
                fontSize: "2rem",
                letterSpacing: "-0.06em",
              }}
            >
              {props.model.timer.display}
            </NumericDisplay>
            <SurfaceTooltip title={props.model.timer.startLabel}>
              <span
                aria-label={
                  !props.model.timer.canStart
                    ? `${props.model.timer.startLabel} (disabled)`
                    : undefined
                }
                tabIndex={!props.model.timer.canStart ? 0 : undefined}
              >
                <SurfaceIconButton
                  aria-label={props.model.timer.startLabel}
                  disabled={!props.model.timer.canStart}
                  onClick={
                    props.model.timer.isRunning
                      ? props.model.timer.onPause
                      : props.model.timer.onStart
                  }
                  sx={{
                    backgroundColor: alpha(cognipaceTokens.accent, 0.12),
                    border: `1px solid ${alpha(cognipaceTokens.accentSoft, 0.2)}`,
                    color: "primary.light",
                    "&:hover": {
                      backgroundColor: alpha(cognipaceTokens.accent, 0.2),
                    },
                  }}
                >
                  {props.model.timer.isRunning ? (
                    <PauseRounded fontSize="small"/>
                  ) : (
                    <PlayArrowRounded fontSize="small"/>
                  )}
                </SurfaceIconButton>
              </span>
            </SurfaceTooltip>
            <SurfaceTooltip title="Restart timer">
              <span
                aria-label={
                  !props.model.timer.canReset
                    ? "Restart timer (disabled)"
                    : undefined
                }
                tabIndex={!props.model.timer.canReset ? 0 : undefined}
              >
                <SurfaceIconButton
                  aria-label="Restart timer"
                  disabled={!props.model.timer.canReset}
                  onClick={props.model.timer.onReset}
                >
                  <RestartAltRounded fontSize="small"/>
                </SurfaceIconButton>
              </span>
            </SurfaceTooltip>
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
            <SurfaceTooltip title="Fail review">
              <span
                aria-label={
                  !props.model.actions.canFail
                    ? "Fail review (disabled)"
                    : undefined
                }
                tabIndex={!props.model.actions.canFail ? 0 : undefined}
              >
                <SurfaceIconButton
                  aria-label="Fail review"
                  disabled={!props.model.actions.canFail}
                  onClick={props.model.actions.onFail}
                  sx={{
                    backgroundColor: cognipaceTokens.danger,
                    borderRadius: 1.1,
                    boxShadow: `0 12px 24px ${alpha(cognipaceTokens.danger, 0.18)}`,
                    color: cognipaceTokens.background,
                    height: 34,
                    width: 34,
                    "&:hover": {
                      backgroundColor: "#ffc3bb",
                    },
                  }}
                >
                  <CancelRounded fontSize="small"/>
                </SurfaceIconButton>
              </span>
            </SurfaceTooltip>
          </Stack>
        </Stack>
        <FieldAssistRow id={props.model.assist.id} tone={props.model.assist.tone}>
          {props.model.assist.message}
        </FieldAssistRow>
        {props.model.feedback ? (
          <OverlayFeedbackSurface feedback={props.model.feedback}/>
        ) : null}
      </Stack>
    </Paper>
  );
}
