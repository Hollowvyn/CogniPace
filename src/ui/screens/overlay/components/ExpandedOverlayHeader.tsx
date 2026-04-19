import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import {alpha} from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import {Difficulty} from "../../../../domain/types";
import {kineticTokens} from "../../../theme";
import {
  OverlayHeaderSectionViewModel,
  OverlayHeaderStatusCard,
  OverlayHeaderStatusTone,
} from "../overlayPanel.types";

import {outlinedChromeIconButtonSx} from "./sharedStyles";

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

function DifficultyBadge(props: {difficulty: Difficulty}) {
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

export function ExpandedOverlayHeader(
  props: {
    header: OverlayHeaderSectionViewModel;
  }
) {
  return (
    <>
      <Stack
        alignItems="center"
        direction="row"
        onClick={props.header.onToggleCollapse}
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
                props.header.onToggleCollapse();
              }}
              size="small"
              sx={outlinedChromeIconButtonSx}
            >
              <KeyboardArrowDownRounded fontSize="small"/>
            </IconButton>
          </Tooltip>
          <Tooltip title="Open settings">
            <IconButton
              aria-label="Open settings"
              onClick={(event) => {
                event.stopPropagation();
                props.header.onOpenSettings();
              }}
              size="small"
              sx={outlinedChromeIconButtonSx}
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
            {props.header.title}
          </Typography>
        </Stack>
      </Stack>

      <Stack spacing={1}>
        <Stack
          alignItems="center"
          direction="row"
          justifyContent="space-between"
          spacing={1}
        >
          <Box sx={{minWidth: 0}}>
            <Typography color="primary.light" variant="overline">
              {props.header.sessionLabel}
            </Typography>
          </Box>
          <DifficultyBadge difficulty={props.header.difficulty}/>
        </Stack>
        <Stack direction="row" flexWrap="wrap" gap={0.9} sx={{width: "100%"}}>
          {props.header.status.cards.map((card) => (
            <HeaderStatusCard
              card={card}
              empty={props.header.status.kind === "empty"}
              key={`${card.label}-${card.primary}`}
            />
          ))}
        </Stack>
      </Stack>
    </>
  );
}
