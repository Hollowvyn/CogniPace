/** Pure presentational overlay panel rendered inside the LeetCode page shadow root. */
import CloseFullscreenRounded from "@mui/icons-material/CloseFullscreenRounded";
import OpenInFullRounded from "@mui/icons-material/OpenInFullRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import {Difficulty, Rating, ReviewMode} from "../../../shared/types";
import {ToneChip} from "../../components";
import {difficultyTone, Tone} from "../../presentation/studyState";

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
  goalDisplay: string;
  hint: string;
  isDue: boolean;
  isTimerRunning: boolean;
  lastReviewedLabel: string;
  modeBadgeLabel: string;
  nextReviewLabel: string;
  notes: string;
  onChangeMode: (mode: ReviewMode) => void;
  onChangeNotes: (value: string) => void;
  onOpenSettings: () => void;
  onPauseTimer: () => void;
  onQuickSubmit: () => void;
  onRefresh: () => void;
  onResetTimer: () => void;
  onSaveReview: () => void;
  onSelectRating: (rating: Rating) => void;
  onStartTimer: () => void;
  onToggleCollapse: () => void;
  phaseLabel: string;
  phaseTone: Tone;
  quickRatingLabel: string;
  saveButtonLabel: string;
  selectedMode: ReviewMode;
  selectedRating: Rating;
  timerDisplay: string;
  title: string;
}

/** Renders the overlay shell from controller-provided props only. */
export function OverlayPanel(props: OverlayPanelProps) {
  const shellWidth = props.collapsed ? 332 : 360;

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
          {!props.collapsed ? (
            <Tooltip title="Open settings">
              <IconButton
                aria-label="Open settings"
                onClick={props.onOpenSettings}
                size="small"
              >
                <SettingsRounded fontSize="small"/>
              </IconButton>
            </Tooltip>
          ) : null}
          <Tooltip title={props.collapsed ? "Expand overlay" : "Collapse overlay"}>
            <IconButton
              aria-label={props.collapsed ? "Expand overlay" : "Collapse overlay"}
              onClick={props.onToggleCollapse}
              size="small"
            >
              {props.collapsed ? (
                <OpenInFullRounded fontSize="small"/>
              ) : (
                <CloseFullscreenRounded fontSize="small"/>
              )}
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Box sx={{p: props.collapsed ? 1.5 : 1.75}}>
        <Stack spacing={props.collapsed ? 1.5 : 2}>
          <Stack
            alignItems="flex-start"
            direction="row"
            justifyContent="space-between"
            spacing={1}
          >
            <Box sx={{minWidth: 0}}>
              <Typography noWrap variant={props.collapsed ? "h6" : "h4"}>
                {props.title}
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{mt: 1}}>
                <ToneChip label={props.modeBadgeLabel} tone="accent"/>
                <ToneChip label={props.phaseLabel} tone={props.phaseTone}/>
                {props.isDue ? <ToneChip label="Due now" tone="info"/> : null}
              </Stack>
            </Box>
            <ToneChip
              label={props.difficulty}
              tone={difficultyTone(props.difficulty)}
            />
          </Stack>

          {!props.collapsed ? (
            <Typography color="text.secondary" variant="body2">
              Quick submit is conservative: Good under goal, Hard if you drift
              past it, Again if the run blows through the target. Use
              recalibration below to override.
            </Typography>
          ) : null}

          <Paper sx={{p: props.collapsed ? 1.25 : 1.5}}>
            <Stack spacing={1.25}>
              <Stack
                alignItems="center"
                direction="row"
                justifyContent="space-between"
                spacing={1}
              >
                <Typography color="text.secondary" variant="overline">
                  Solve Timer
                </Typography>
                <Typography variant="body2">{props.goalDisplay}</Typography>
              </Stack>
              <Typography variant={props.collapsed ? "h4" : "h3"}>
                {props.timerDisplay}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {props.hint}
              </Typography>
              <Stack direction="row" spacing={0.75}>
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
                  Reset
                </Button>
              </Stack>
              <Stack
                alignItems="center"
                direction="row"
                justifyContent="space-between"
                spacing={1}
              >
                <Typography color="text.secondary" variant="body2">
                  {props.quickRatingLabel}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {props.lastReviewedLabel}
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          {props.collapsed ? null : (
            <>
              <Stack spacing={1.25}>
                <Stack
                  alignItems="center"
                  direction="row"
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Typography color="text.secondary" variant="overline">
                    Recalibration Protocol
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
                <Stack
                  alignItems="center"
                  direction="row"
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Typography color="text.secondary" variant="overline">
                    Technical Notes
                  </Typography>
                  <Typography color="secondary.main" variant="body2">
                    Optional
                  </Typography>
                </Stack>
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
            </>
          )}

          {props.collapsed ? (
            <Button
              fullWidth
              onClick={props.onQuickSubmit}
              sx={{minHeight: 38}}
              variant="contained"
            >
              Submit
            </Button>
          ) : null}

          <Alert severity={props.feedbackIsError ? "error" : "info"}>
            {props.feedback || props.nextReviewLabel}
          </Alert>
        </Stack>
      </Box>
    </Paper>
  );
}
