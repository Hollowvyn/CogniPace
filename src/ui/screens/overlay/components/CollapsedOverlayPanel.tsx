import CancelRounded from "@mui/icons-material/CancelRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import KeyboardArrowUpRounded from "@mui/icons-material/KeyboardArrowUpRounded";
import PauseRounded from "@mui/icons-material/PauseRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import VisibilityOffRounded from "@mui/icons-material/VisibilityOffRounded";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import {alpha} from "@mui/material/styles";

import {FieldAssistRow, NumericDisplay, SurfaceIconButton, SurfaceTooltip} from "../../../components";
import {cognipaceControlScale, cognipaceTokens} from "../../../theme";
import {CollapsedOverlayViewModel} from "../overlayPanel.types";

import {OverlayFeedbackSurface} from "./OverlayFeedbackSurface";

const collapsedQuickActionSx = {
  height: cognipaceControlScale.compactButtonMinHeight,
  width: cognipaceControlScale.compactButtonMinWidth,
};

const collapsedSubmitActionSx = {
  ...collapsedQuickActionSx,
  backgroundColor: alpha(cognipaceTokens.success, 0.14),
  border: `1px solid ${alpha(cognipaceTokens.success, 0.28)}`,
  boxShadow: `0 12px 24px ${alpha(cognipaceTokens.success, 0.16)}`,
  color: cognipaceTokens.success,
  "&:hover": {
    backgroundColor: alpha(cognipaceTokens.success, 0.22),
    borderColor: alpha(cognipaceTokens.success, 0.42),
    color: "#c7f0d3",
  },
};

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
        width: 392,
      }}
    >
      <Stack spacing={0.9} sx={{px: 2, py: 1.3}}>
        <Stack
          alignItems="center"
          direction="row"
          spacing={1}
          sx={{minWidth: 0}}
        >
          <Stack
            alignItems="center"
            direction="row"
            spacing={0.6}
            sx={{flex: 1, minWidth: 0}}
          >
            <Stack alignItems="center" direction="row" spacing={0.7}>
              <SurfaceTooltip title="Expand overlay">
                <SurfaceIconButton
                  aria-label="Expand overlay"
                  onClick={props.model.actions.onExpand}
                  sx={collapsedQuickActionSx}
                >
                  <KeyboardArrowUpRounded fontSize="small"/>
                </SurfaceIconButton>
              </SurfaceTooltip>
              <SurfaceTooltip title="Hide overlay">
                <SurfaceIconButton
                  aria-label="Hide overlay"
                  onClick={props.model.actions.onHide}
                  sx={collapsedQuickActionSx}
                >
                  <VisibilityOffRounded fontSize="small"/>
                </SurfaceIconButton>
              </SurfaceTooltip>
            </Stack>
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
                fontSize: "1.72rem",
                letterSpacing: "-0.06em",
              }}
            >
              {props.model.timer.display}
            </NumericDisplay>
            <Stack alignItems="center" direction="row" spacing={0.7}>
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
                      ...collapsedQuickActionSx,
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
                    sx={collapsedQuickActionSx}
                  >
                    <RestartAltRounded fontSize="small"/>
                  </SurfaceIconButton>
                </span>
              </SurfaceTooltip>
            </Stack>
          </Stack>
          <Stack
            alignItems="center"
            direction="row"
            spacing={0.7}
            sx={{flexShrink: 0}}
          >
            <SurfaceTooltip title="Submit review">
              <span
                aria-label={
                  !props.model.actions.canSubmit ? "Submit (disabled)" : undefined
                }
                tabIndex={!props.model.actions.canSubmit ? 0 : undefined}
              >
                <SurfaceIconButton
                  aria-label="Submit"
                  disabled={!props.model.actions.canSubmit}
                  onClick={props.model.actions.onSubmit}
                  sx={collapsedSubmitActionSx}
                >
                  <CheckRounded fontSize="small"/>
                </SurfaceIconButton>
              </span>
            </SurfaceTooltip>
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
                    ...collapsedQuickActionSx,
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
