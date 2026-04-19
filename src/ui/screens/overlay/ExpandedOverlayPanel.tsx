import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import {alpha} from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import {Difficulty, Rating} from "../../../domain/types";
import {kineticTokens} from "../../theme";

import {
  OverlayDraftLogFields,
  OverlayHeaderStatusCard,
  OverlayHeaderStatusTone,
  OverlayPanelProps,
} from "./overlayPanel.types";

interface AssessmentOption {
  color: string;
  copy: string;
  label: string;
  rating: Rating;
}

const assessmentOptions: AssessmentOption[] = [
  {
    color: kineticTokens.success,
    copy: "Fast",
    label: "Easy",
    rating: 3,
  },
  {
    color: "#c2cf70",
    copy: "Stable",
    label: "Good",
    rating: 2,
  },
  {
    color: kineticTokens.accentSoft,
    copy: "Lagging",
    label: "Hard",
    rating: 1,
  },
  {
    color: kineticTokens.danger,
    copy: "Failed",
    label: "Again",
    rating: 0,
  },
];

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

const actionButtonSx = {
  flex: 1,
  minHeight: 44,
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const assessmentRailDividerColor = alpha(kineticTokens.mutedText, 0.12);
const headerIconButtonSx = {
  backgroundColor: alpha(kineticTokens.mutedText, 0.08),
  border: `1px solid ${alpha(kineticTokens.mutedText, 0.16)}`,
  color: "text.secondary",
  "&:hover": {
    backgroundColor: alpha(kineticTokens.mutedText, 0.14),
  },
};

const statusToneStyles: Record<
  OverlayHeaderStatusTone,
  { backgroundColor: string; borderColor: string; primaryColor: string }
> = {
  neutral: {
    backgroundColor: alpha(kineticTokens.backgroundAlt, 0.64),
    borderColor: alpha(kineticTokens.mutedText, 0.12),
    primaryColor: kineticTokens.text,
  },
  accent: {
    backgroundColor: alpha(kineticTokens.accent, 0.08),
    borderColor: alpha(kineticTokens.accent, 0.18),
    primaryColor: kineticTokens.accentSoft,
  },
  warning: {
    backgroundColor: alpha(kineticTokens.accent, 0.12),
    borderColor: alpha(kineticTokens.accent, 0.24),
    primaryColor: kineticTokens.accentSoft,
  },
  danger: {
    backgroundColor: alpha(kineticTokens.danger, 0.08),
    borderColor: alpha(kineticTokens.danger, 0.22),
    primaryColor: kineticTokens.danger,
  },
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

function HeaderStatusCard(
  props: {
    card: OverlayHeaderStatusCard;
    empty?: boolean;
  }
) {
  const toneStyle = statusToneStyles[props.card.tone];

  return (
    <Paper
      sx={{
        backgroundColor: toneStyle.backgroundColor,
        border: `1px solid ${toneStyle.borderColor}`,
        borderRadius: 2,
        boxShadow: "none",
        flex: 1,
        minWidth: 0,
        px: props.empty ? 1.35 : 1.15,
        py: props.empty ? 1.1 : 0.95,
      }}
    >
      <Stack spacing={0.3}>
        <Typography color="text.secondary" variant="caption">
          {props.card.label}
        </Typography>
        <Typography
          color={toneStyle.primaryColor}
          sx={{
            fontWeight: 600,
            lineHeight: 1.15,
          }}
          variant="body1"
        >
          {props.card.primary}
        </Typography>
        {props.card.secondary ? (
          <Typography color="text.secondary" variant="caption">
            {props.card.secondary}
          </Typography>
        ) : null}
      </Stack>
    </Paper>
  );
}

function assessmentToggleSx(color: string) {
  return {
    alignItems: "stretch",
    backgroundColor: alpha(color, 0.08),
    color: alpha(color, 0.94),
    flex: 1,
    minHeight: 76,
    minWidth: 0,
    px: 1.1,
    py: 1.05,
    textAlign: "center",
    transition: "background-color 160ms ease, border-color 160ms ease, color 160ms ease",
    "& .assessment-label": {
      color: alpha(color, 0.92),
    },
    "& .assessment-copy": {
      color: alpha(color, 0.72),
    },
    "&.Mui-selected": {
      backgroundColor: alpha(color, 0.75),
      boxShadow: `inset 0 0 0 1px ${alpha(color, 0.85)}`,
      color: kineticTokens.text,
    },
    "&.Mui-selected .assessment-label": {
      color: kineticTokens.text,
    },
    "&.Mui-selected .assessment-copy": {
      color: alpha(kineticTokens.text, 0.82),
    },
    "&:hover": {
      backgroundColor: alpha(color, 0.12),
    },
    "&.Mui-selected:hover": {
      backgroundColor: alpha(color, 0.4),
    },
  } as const;
}

function DraftField(
  props: {
    ariaLabel: string;
    draft: OverlayDraftLogFields;
    field: keyof OverlayDraftLogFields;
    label: string;
    multiline?: boolean;
    onChangeDraft: OverlayPanelProps["onChangeDraft"];
    rows?: number;
  }
) {
  return (
    <TextField
      fullWidth
      label={props.label}
      multiline={props.multiline}
      onChange={(event) => {
        props.onChangeDraft(props.field, event.target.value);
      }}
      rows={props.rows}
      size="small"
      slotProps={{
        htmlInput: {
          "aria-label": props.ariaLabel,
        },
      }}
      value={props.draft[props.field]}
    />
  );
}

/** Expanded overlay surface shown after the compact inlay is opened. */
export function ExpandedOverlayPanel(props: OverlayPanelProps) {
  return (
    <Paper
      sx={{
        border: (theme) => `1px solid ${theme.palette.divider}`,
        borderRadius: 1.5,
        overflow: "hidden",
        width: 392,
      }}
    >
      <Stack
        alignItems="center"
        direction="row"
        onClick={props.onToggleCollapse}
        spacing={0.85}
        sx={{
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          p: 1.65,
        }}
        data-testid="expanded-overlay-header-row"
      >
        <Stack alignItems="center" direction="row" spacing={0.55}>
          <Tooltip title="Collapse overlay">
            <IconButton
              aria-label="Collapse overlay"
              onClick={(event) => {
                event.stopPropagation();
                props.onToggleCollapse();
              }}
              size="small"
              sx={headerIconButtonSx}
            >
              <KeyboardArrowDownRounded fontSize="small"/>
            </IconButton>
          </Tooltip>
          <Tooltip title="Open settings">
            <IconButton
              aria-label="Open settings"
              onClick={(event) => {
                event.stopPropagation();
                props.onOpenSettings();
              }}
              size="small"
              sx={headerIconButtonSx}
            >
              <SettingsRounded fontSize="small"/>
            </IconButton>
          </Tooltip>
          <Box
            aria-hidden="true"
            data-testid="expanded-overlay-header-divider"
            sx={{
              alignSelf: "stretch",
              backgroundColor: (theme) => theme.palette.divider,
              borderRadius: 999,
              width: "1px",
            }}
          />
        </Stack>
        <Stack
          alignItems="center"
          direction="row"
          sx={{flex: 1, minWidth: 0}}
        >
          <Typography
            color="primary.light"
            noWrap
            sx={{flexShrink: 1, minWidth: 0}}
            variant="overline"
          >
            {props.title}
          </Typography>
        </Stack>
      </Stack>

      <Box sx={{p: 2}}>
        <Stack spacing={2}>
          <Stack spacing={1}>
            <Stack
              alignItems="center"
              direction="row"
              justifyContent="space-between"
              spacing={1}
            >
              <Box sx={{minWidth: 0}}>
                <Typography color="primary.light" variant="overline">
                  {props.sessionLabel}
                </Typography>
              </Box>
              <DifficultyBadge difficulty={props.difficulty}/>
            </Stack>
            <Stack
              direction="row"
              flexWrap="wrap"
              gap={0.9}
              sx={{width: "100%"}}
            >
              {props.headerStatus.cards.map((card) => (
                <HeaderStatusCard
                  card={card}
                  empty={props.headerStatus.kind === "empty"}
                  key={`${card.label}-${card.primary}`}
                />
              ))}
            </Stack>
          </Stack>

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
                  {props.timerDisplay}
                </Typography>
                <Stack alignItems="flex-end" spacing={0.25} sx={{pt: 0.25}}>
                  <Typography color="text.secondary" variant="caption">
                    Target time
                  </Typography>
                  <Typography variant="body1">{props.targetDisplay}</Typography>
                </Stack>
              </Stack>

              <Stack direction="row" flexWrap="wrap" gap={0.85}>
                <Button
                  disabled={
                    props.isTimerRunning ||
                    (!props.canEditTimer && !props.canRestartSession)
                  }
                  onClick={props.onStartTimer}
                  size="small"
                  variant="contained"
                >
                  Start
                </Button>
                <Button
                  disabled={!props.canEditTimer || !props.isTimerRunning}
                  onClick={props.onPauseTimer}
                  size="small"
                  variant="outlined"
                >
                  Pause
                </Button>
                <Button
                  disabled={!props.canResetTimer}
                  onClick={props.onResetTimer}
                  size="small"
                  startIcon={<RestartAltRounded fontSize="small"/>}
                  variant="outlined"
                >
                  Reset timer
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Stack spacing={1.15}>
            <Typography color="text.secondary" variant="overline">
              Assessment
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              sx={{
                backgroundColor: alpha(kineticTokens.backgroundAlt, 0.52),
                border: `1px solid ${assessmentRailDividerColor}`,
                borderRadius: 2.5,
                overflow: "hidden",
                "& .MuiToggleButtonGroup-grouped": {
                  border: 0,
                  borderRadius: 0,
                  margin: 0,
                },
                "& .MuiToggleButtonGroup-grouped:not(:first-of-type)": {
                  borderLeft: `1px solid ${assessmentRailDividerColor}`,
                },
              }}
              onChange={(_, value: Rating | null) => {
                if (value === null) {
                  return;
                }

                props.onSelectRating(value);
              }}
              value={props.selectedRating}
            >
              {assessmentOptions.map((option) => {
                return (
                  <ToggleButton
                    key={option.rating}
                    sx={assessmentToggleSx(option.color)}
                    value={option.rating}
                  >
                    <Stack
                      alignItems="center"
                      spacing={0.25}
                      sx={{justifyContent: "center", width: "100%"}}
                    >
                      <Typography className="assessment-label" variant="button">
                        {option.label}
                      </Typography>
                      <Typography className="assessment-copy" variant="caption">
                        {option.copy}
                      </Typography>
                    </Stack>
                  </ToggleButton>
                );
              })}
            </ToggleButtonGroup>
          </Stack>

          <Stack spacing={1.5}>
            <Typography color="text.secondary" variant="overline">
              Log
            </Typography>
            <DraftField
              ariaLabel="Interview pattern"
              draft={props.draft}
              field="interviewPattern"
              label="Interview pattern"
              onChangeDraft={props.onChangeDraft}
            />
            <Stack direction="row" spacing={1.25}>
              <DraftField
                ariaLabel="Time complexity"
                draft={props.draft}
                field="timeComplexity"
                label="Time complexity"
                onChangeDraft={props.onChangeDraft}
              />
              <DraftField
                ariaLabel="Space complexity"
                draft={props.draft}
                field="spaceComplexity"
                label="Space complexity"
                onChangeDraft={props.onChangeDraft}
              />
            </Stack>
            <DraftField
              ariaLabel="Languages used"
              draft={props.draft}
              field="languages"
              label="Languages used"
              onChangeDraft={props.onChangeDraft}
            />
            <DraftField
              ariaLabel="Notes"
              draft={props.draft}
              field="notes"
              label="Notes"
              multiline
              onChangeDraft={props.onChangeDraft}
              rows={5}
            />
          </Stack>

          <Stack spacing={1.05}>
            <Stack
              alignItems="center"
              direction="row"
              flexWrap="wrap"
              gap={0.95}
              sx={{width: "100%"}}
            >
              <Button
                disabled={!props.canRestartSession}
                onClick={props.onRestartSession}
                sx={actionButtonSx}
                variant="outlined"
              >
                Restart
              </Button>
              <Button
                disabled={!props.canSaveOverride}
                onClick={props.onSaveOverride}
                sx={actionButtonSx}
                variant="outlined"
              >
                Update
              </Button>
              <Button
                disabled={!props.canSubmit}
                onClick={props.onSubmit}
                sx={actionButtonSx}
                variant="contained"
              >
                Submit
              </Button>
            </Stack>
            <Button
              color="error"
              disabled={!props.canSubmit}
              fullWidth
              onClick={props.onFailReview}
              variant="outlined"
            >
              I couldn&apos;t finish :(
            </Button>
          </Stack>

          {props.feedback ? (
            <FeedbackSurface
              isError={props.feedbackIsError}
              message={props.feedback}
            />
          ) : null}
        </Stack>
      </Box>
    </Paper>
  );
}
