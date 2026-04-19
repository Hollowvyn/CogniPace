/** Pure presentational overlay panel rendered inside the LeetCode page shadow root. */
import CancelRounded from "@mui/icons-material/CancelRounded";
import CloseFullscreenRounded from "@mui/icons-material/CloseFullscreenRounded";
import KeyboardArrowUpRounded from "@mui/icons-material/KeyboardArrowUpRounded";
import PauseRounded from "@mui/icons-material/PauseRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import {alpha} from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import {Difficulty, Rating, ReviewMode} from "../../../shared/types";
import {kineticTokens} from "../../theme";

const ratingCopy: Record<Rating, string> = {
  0: "Reset",
  1: "Lagging",
  2: "Stable",
  3: "Fast",
};

const ratingLabel: Record<Rating, string> = {
  0: "Again",
  1: "Hard",
  2: "Good",
  3: "Easy",
};

export interface OverlayPanelProps {
  canReset: boolean;
  collapsed: boolean;
  difficulty: Difficulty;
  feedback: string;
  feedbackIsError: boolean;
  isTimerRunning: boolean;
  nextReviewLabel: string;
  notes: string;
  onChangeMode: (mode: ReviewMode) => void;
  onChangeNotes: (value: string) => void;
  onCompactSubmit: () => void;
  onCompactFail: () => void;
  onOpenSettings: () => void;
  onPauseTimer: () => void;
  onQuickSubmit: () => void;
  onRefresh: () => void;
  onResetTimer: () => void;
  onSaveReview: () => void;
  onSelectRating: (rating: Rating) => void;
  onStartTimer: () => void;
  onToggleCollapse: () => void;
  saveButtonLabel: string;
  selectedMode: ReviewMode;
  selectedRating: Rating;
  statusLabel: string;
  targetDisplay: string;
  timerDisplay: string;
  title: string;
}

const difficultyBadgeStyles: Record<
  Difficulty,
  { backgroundColor: string; borderColor: string; color: string }
> = {
  Easy: {
    backgroundColor: alpha(kineticTokens.info, 0.1),
    borderColor: alpha(kineticTokens.info, 0.22),
    color: kineticTokens.info,
  },
  Medium: {
    backgroundColor: alpha(kineticTokens.accent, 0.1),
    borderColor: alpha(kineticTokens.accent, 0.22),
    color: kineticTokens.accentSoft,
  },
  Hard: {
    backgroundColor: alpha(kineticTokens.danger, 0.1),
    borderColor: alpha(kineticTokens.danger, 0.22),
    color: kineticTokens.danger,
  },
  Unknown: {
    backgroundColor: alpha(kineticTokens.mutedText, 0.1),
    borderColor: alpha(kineticTokens.mutedText, 0.16),
    color: kineticTokens.mutedText,
  },
};

const timerTextSx = {
  fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif',
  fontWeight: 700,
  letterSpacing: "-0.06em",
  lineHeight: 1,
};

function DifficultyBadge(props: { difficulty: Difficulty }) {
  const badgeStyle = difficultyBadgeStyles[props.difficulty];

  return (
    <Box
      sx={{
        alignItems: "center",
        backgroundColor: badgeStyle.backgroundColor,
        border: `1px solid ${badgeStyle.borderColor}`,
        borderRadius: 999,
        color: badgeStyle.color,
        display: "inline-flex",
        minHeight: 32,
        px: 1.25,
      }}
    >
      <Typography variant="button">{props.difficulty}</Typography>
    </Box>
  );
}

function FeedbackSurface(props: { isError: boolean; message: string }) {
  return (
    <Paper
      sx={{
        backgroundColor: props.isError
          ? alpha(kineticTokens.danger, 0.08)
          : alpha(kineticTokens.backgroundAlt, 0.92),
        border: `1px solid ${
          props.isError
            ? alpha(kineticTokens.danger, 0.2)
            : alpha(kineticTokens.accent, 0.12)
        }`,
        borderRadius: 2.25,
        p: 1.25,
      }}
    >
      <Typography
        color={props.isError ? "error.main" : "text.primary"}
        variant="body2"
      >
        {props.message}
      </Typography>
    </Paper>
  );
}

/** Renders the overlay shell from controller-provided props only. */
export function OverlayPanel(props: OverlayPanelProps) {
  const shellWidth = props.collapsed ? 408 : 372;
  const collapsedTimerActionLabel = props.isTimerRunning
    ? "Pause timer"
    : "Start timer";
  const collapsedRestartLabel = "Restart timer";
  const handleCollapsedSurfaceClick = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    const clickedElement = event.target;
    if (
      clickedElement instanceof Element &&
      clickedElement.closest("[data-overlay-interactive='true']")
    ) {
      return;
    }

    props.onToggleCollapse();
  };

  if (props.collapsed) {
    return (
      <Paper
        onClick={handleCollapsedSurfaceClick}
        sx={{
          borderRadius: 2.25,
          border: (theme) => `1px solid ${theme.palette.divider}`,
          overflow: "hidden",
          width: shellWidth,
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
                  data-overlay-interactive="true"
                  onClick={props.onToggleCollapse}
                  size="small"
                  sx={{
                    backgroundColor: alpha(kineticTokens.mutedText, 0.08),
                    border: `1px solid ${alpha(kineticTokens.mutedText, 0.16)}`,
                    color: "text.secondary",
                    "&:hover": {
                      backgroundColor: alpha(kineticTokens.mutedText, 0.14),
                    },
                  }}
                >
                  <KeyboardArrowUpRounded fontSize="small"/>
                </IconButton>
              </Tooltip>
              <Box
                data-overlay-interactive="true"
                sx={{
                  alignSelf: "stretch",
                  backgroundColor: (theme) => theme.palette.divider,
                  borderRadius: 999,
                  width: "1px",
                }}
              />
              <Typography
                component="div"
                data-overlay-interactive="true"
                sx={{
                  ...timerTextSx,
                  flexShrink: 0,
                  fontSize: "2rem",
                }}
              >
                {props.timerDisplay}
              </Typography>
              <Tooltip title={collapsedTimerActionLabel}>
                <IconButton
                  aria-label={collapsedTimerActionLabel}
                  data-overlay-interactive="true"
                  onClick={
                    props.isTimerRunning
                      ? props.onPauseTimer
                      : props.onStartTimer
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
                  {props.isTimerRunning ? (
                    <PauseRounded fontSize="small"/>
                  ) : (
                    <PlayArrowRounded fontSize="small"/>
                  )}
                </IconButton>
              </Tooltip>
              <Tooltip title={collapsedRestartLabel}>
                <span data-overlay-interactive="true">
                  <IconButton
                    aria-label={collapsedRestartLabel}
                    data-overlay-interactive="true"
                    disabled={!props.canReset}
                    onClick={props.onResetTimer}
                    size="small"
                    sx={{
                      backgroundColor: alpha(kineticTokens.mutedText, 0.08),
                      border: `1px solid ${alpha(kineticTokens.mutedText, 0.16)}`,
                      color: "text.secondary",
                      "&:hover": {
                        backgroundColor: alpha(kineticTokens.mutedText, 0.14),
                      },
                    }}
                  >
                    <RestartAltRounded fontSize="small"/>
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
            <Stack alignItems="center" direction="row" spacing={0.75}>
              <Button
                data-overlay-interactive="true"
                onClick={props.onCompactSubmit}
                size="small"
                variant="contained"
              >
                Submit
              </Button>
              <Tooltip title="Fail review">
                <IconButton
                  aria-label="Fail review"
                  data-overlay-interactive="true"
                  onClick={props.onCompactFail}
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
              </Tooltip>
            </Stack>
          </Stack>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        borderRadius: 1.5,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        overflow: "hidden",
        width: shellWidth,
      }}
    >
      <Stack
        alignItems="center"
        direction="row"
        justifyContent="space-between"
        spacing={1}
        sx={{
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          p: props.collapsed ? 1.25 : 1.5,
        }}
      >
        <Typography color="primary.light" variant="overline">
          Kinetic Terminal
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Open settings">
            <IconButton
              aria-label="Open settings"
              onClick={props.onOpenSettings}
              size="small"
            >
              <SettingsRounded fontSize="small"/>
            </IconButton>
          </Tooltip>
          <Tooltip title="Collapse overlay">
            <IconButton
              aria-label="Collapse overlay"
              onClick={props.onToggleCollapse}
              size="small"
            >
              <CloseFullscreenRounded fontSize="small"/>
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Box sx={{p: 1.75}}>
        <Stack spacing={2}>
          <Stack
            alignItems="flex-start"
            direction="row"
            justifyContent="space-between"
            spacing={1}
          >
            <Box sx={{minWidth: 0}}>
              <Typography noWrap variant="h4">
                {props.title}
              </Typography>
              {props.statusLabel ? (
                <Typography
                  color="text.secondary"
                  sx={{mt: 0.75}}
                  variant="body2"
                >
                  {props.statusLabel}
                </Typography>
              ) : null}
            </Box>
            <DifficultyBadge difficulty={props.difficulty}/>
          </Stack>

          <Paper
            sx={{
              backgroundColor: alpha(kineticTokens.backgroundAlt, 0.72),
              border: `1px solid ${alpha(kineticTokens.accent, 0.1)}`,
              borderRadius: 2.5,
              p: 1.5,
            }}
          >
            <Stack spacing={1.5}>
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
                    fontSize: "3rem",
                  }}
                >
                  {props.timerDisplay}
                </Typography>
                <Stack alignItems="flex-end" spacing={0.25} sx={{pt: 0.5}}>
                  <Typography color="text.secondary" variant="caption">
                    {props.difficulty} target
                  </Typography>
                  <Typography variant="body1">{props.targetDisplay}</Typography>
                </Stack>
              </Stack>

              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                <Button
                  disabled={props.isTimerRunning}
                  onClick={props.onStartTimer}
                  size="small"
                  variant={props.collapsed ? "outlined" : "contained"}
                >
                  Start
                </Button>
                <Button
                  disabled={!props.isTimerRunning}
                  onClick={props.onPauseTimer}
                  size="small"
                  variant="outlined"
                >
                  Pause
                </Button>
                <Button
                  disabled={!props.canReset}
                  onClick={props.onResetTimer}
                  size="small"
                  variant="outlined"
                >
                  Restart
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Stack spacing={1.25}>
            <Stack
              alignItems="center"
              direction="row"
              justifyContent="space-between"
              spacing={1}
            >
              <Typography color="text.secondary" variant="overline">
                Rating
              </Typography>
              <FormControl size="small" sx={{minWidth: 140}}>
                <Select
                  onChange={(event) => {
                    props.onChangeMode(event.target.value as ReviewMode);
                  }}
                  value={props.selectedMode}
                >
                  <MenuItem value="FULL_SOLVE">Full solve</MenuItem>
                  <MenuItem value="RECALL">Recall mode</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <ToggleButtonGroup
              exclusive
              fullWidth
              onChange={(_, value: Rating | null) => {
                if (value === null) {
                  return;
                }
                props.onSelectRating(value);
              }}
              value={props.selectedRating}
            >
              {[0, 1, 2, 3].map((rating) => {
                const typedRating = rating as Rating;
                return (
                  <ToggleButton key={typedRating} value={typedRating}>
                    <Stack spacing={0.25}>
                      <Typography variant="button">
                        {ratingLabel[typedRating]}
                      </Typography>
                      <Typography color="text.secondary" variant="caption">
                        {ratingCopy[typedRating]}
                      </Typography>
                    </Stack>
                  </ToggleButton>
                );
              })}
            </ToggleButtonGroup>
          </Stack>

          <Stack spacing={1}>
            <Typography color="text.secondary" variant="overline">
              Notes
            </Typography>
            <TextField
              fullWidth
              multiline
              onChange={(event) => {
                props.onChangeNotes(event.target.value);
              }}
              placeholder="Add your technical notes or learnings here..."
              rows={5}
              slotProps={{
                htmlInput: {
                  "aria-label": "Technical Notes",
                },
              }}
              value={props.notes}
            />
          </Stack>

          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Button onClick={props.onRefresh} variant="outlined">
              Refresh
            </Button>
            <Stack direction="row" spacing={1}>
              <Button onClick={props.onQuickSubmit} variant="outlined">
                Quick Submit
              </Button>
              <Button onClick={props.onSaveReview} variant="contained">
                {props.saveButtonLabel}
              </Button>
            </Stack>
          </Stack>

          <FeedbackSurface
            isError={props.feedbackIsError}
            message={props.feedback || props.nextReviewLabel}
          />
        </Stack>
      </Box>
    </Paper>
  );
}
