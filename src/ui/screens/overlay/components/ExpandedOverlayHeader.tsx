import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import VisibilityOffRounded from "@mui/icons-material/VisibilityOffRounded";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import {Difficulty} from "../../../../domain/types";
import {StatusSurface, SurfaceIconButton, SurfaceSectionLabel, SurfaceTooltip, ToneChip,} from "../../../components";
import {difficultyTone} from "../../../presentation/studyState";
import {kineticTokens} from "../../../theme";
import {OverlayHeaderSectionViewModel, OverlayHeaderStatusCard, OverlayHeaderStatusTone,} from "../overlayPanel.types";

const difficultyBadgeStyles: Record<
  Difficulty,
  ReturnType<typeof difficultyTone>
> = {
  Easy: "info",
  Medium: "accent",
  Hard: "danger",
  Unknown: "default",
};

const statusToneStyles: Record<
  OverlayHeaderStatusTone,
  { primaryColor: string; tone: "default" | "accent" | "danger" }
> = {
  neutral: {
    primaryColor: kineticTokens.text,
    tone: "default",
  },
  accent: {
    primaryColor: kineticTokens.accentSoft,
    tone: "accent",
  },
  warning: {
    primaryColor: kineticTokens.accentSoft,
    tone: "accent",
  },
  danger: {
    primaryColor: kineticTokens.danger,
    tone: "danger",
  },
};

function DifficultyBadge(props: { difficulty: Difficulty }) {
  return <ToneChip label={props.difficulty} tone={difficultyBadgeStyles[props.difficulty]}/>;
}

function HeaderStatusCard(
  props: {
    card: OverlayHeaderStatusCard;
    empty?: boolean;
  }
) {
  const toneStyle = statusToneStyles[props.card.tone];

  return (
    <StatusSurface
      sx={{
        flex: 1,
        minWidth: 0,
        px: props.empty ? 1.35 : 1.15,
        py: props.empty ? 1.1 : 0.95,
      }}
      tone={toneStyle.tone}
    >
      <Stack spacing={0.3}>
        <SurfaceSectionLabel>{props.card.label}</SurfaceSectionLabel>
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
    </StatusSurface>
  );
}

export function ExpandedOverlayStatus(props: {
  header: OverlayHeaderSectionViewModel;
}) {
  return (
    <Stack spacing={1}>
      <Stack
        alignItems="center"
        direction="row"
        justifyContent="space-between"
        spacing={1}
      >
        <Box sx={{minWidth: 0}}>
          <SurfaceSectionLabel>{props.header.sessionLabel}</SurfaceSectionLabel>
        </Box>
        <DifficultyBadge difficulty={props.header.difficulty}/>
      </Stack>
      <Stack
        direction="row"
        flexWrap="wrap"
        gap={0.9}
        justifyContent="space-between"
      >
        {props.header.status.cards.map((card) => (
          <HeaderStatusCard
            card={card}
            empty={props.header.status.kind === "empty"}
            key={`${card.label}-${card.primary}`}
          />
        ))}
      </Stack>
    </Stack>
  );
}

export function ExpandedOverlayHeader(
  props: {
    header: OverlayHeaderSectionViewModel;
  }
) {
  return (
    <Stack
      alignItems="center"
      direction="row"
      onClick={props.header.onCollapse}
      spacing={0.85}
      sx={{
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        p: 1.65,
      }}
      data-testid="expanded-overlay-header-row"
    >
      <Stack alignItems="center" direction="row" spacing={0.55}>
        <SurfaceTooltip title="Collapse overlay">
          <SurfaceIconButton
            aria-label="Collapse overlay"
            onClick={(event) => {
              event.stopPropagation();
              props.header.onCollapse();
            }}
          >
            <KeyboardArrowDownRounded fontSize="small"/>
          </SurfaceIconButton>
        </SurfaceTooltip>
        <SurfaceTooltip title="Open settings">
          <SurfaceIconButton
            aria-label="Open settings"
            onClick={(event) => {
              event.stopPropagation();
              props.header.onOpenSettings();
            }}
          >
            <SettingsRounded fontSize="small"/>
          </SurfaceIconButton>
        </SurfaceTooltip>
        <SurfaceTooltip title="Hide overlay">
          <SurfaceIconButton
            aria-label="Hide overlay"
            onClick={(event) => {
              event.stopPropagation();
              props.header.onHide();
            }}
          >
            <VisibilityOffRounded fontSize="small"/>
          </SurfaceIconButton>
        </SurfaceTooltip>
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
      <Stack alignItems="center" direction="row" sx={{flex: 1, minWidth: 0}}>
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
  );
}
