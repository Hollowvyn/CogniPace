import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton, { IconButtonProps } from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import { alpha, Theme } from "@mui/material/styles";
import TableContainer from "@mui/material/TableContainer";
import Tooltip, { TooltipProps } from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { SxProps } from "@mui/system";
import { memo, ReactNode } from "react";

import { Tone } from "../presentation/studyState";
import { cognipaceTokens } from "../theme";

const toneStyles: Record<Tone, { background: string; color: string }> = {
  default: {
    background: alpha(cognipaceTokens.mutedText, 0.12),
    color: cognipaceTokens.mutedText,
  },
  accent: {
    background: alpha(cognipaceTokens.accent, 0.16),
    color: cognipaceTokens.accentSoft,
  },
  info: {
    background: alpha(cognipaceTokens.info, 0.16),
    color: cognipaceTokens.info,
  },
  success: {
    background: alpha(cognipaceTokens.success, 0.16),
    color: cognipaceTokens.success,
  },
  danger: {
    background: alpha(cognipaceTokens.danger, 0.16),
    color: cognipaceTokens.danger,
  },
};

type AssistTone = Tone | "warning";
type SurfacePanelVariant = "chrome" | "nested" | "solid";

const assistToneStyles: Record<AssistTone, { border: string; text: string }> = {
  default: {
    border: alpha(cognipaceTokens.outlineStrong, 0.18),
    text: cognipaceTokens.mutedText,
  },
  accent: {
    border: alpha(cognipaceTokens.accentSoft, 0.24),
    text: cognipaceTokens.accentSoft,
  },
  info: {
    border: alpha(cognipaceTokens.info, 0.24),
    text: cognipaceTokens.info,
  },
  success: {
    border: alpha(cognipaceTokens.success, 0.24),
    text: cognipaceTokens.success,
  },
  warning: {
    border: alpha(cognipaceTokens.accentSoft, 0.24),
    text: cognipaceTokens.accentSoft,
  },
  danger: {
    border: alpha(cognipaceTokens.danger, 0.24),
    text: cognipaceTokens.danger,
  },
};

export const BrandMark = memo(function BrandMark() {
  return (
    <Box
      sx={{
        alignItems: "center",
        background: `linear-gradient(135deg, ${alpha(cognipaceTokens.accent, 0.22)}, ${alpha(cognipaceTokens.accentSoft, 0.08)})`,
        borderRadius: "10px",
        boxShadow: `inset 0 0 0 1px ${alpha(cognipaceTokens.accentSoft, 0.12)}`,
        color: "primary.light",
        display: "inline-flex",
        fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif',
        fontWeight: 700,
        height: 32,
        justifyContent: "center",
        width: 32,
      }}
    >
      ⌘
    </Box>
  );
});

export function SurfaceSectionLabel(props: { children: ReactNode }) {
  return (
    <Typography
      color="text.secondary"
      sx={{
        fontSize: "0.64rem",
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
      }}
    >
      {props.children}
    </Typography>
  );
}

export function SurfaceIconButton(props: IconButtonProps) {
  const { sx, ...rest } = props;
  const baseSx: SxProps<Theme> = {
    backgroundColor: alpha(cognipaceTokens.mutedText, 0.08),
    border: `1px solid ${alpha(cognipaceTokens.outlineStrong, 0.34)}`,
    borderRadius: 1.15,
    color: "text.secondary",
    height: 30,
    transition:
      "border-color 160ms ease, background-color 160ms ease, color 160ms ease",
    width: 30,
    "&:hover": {
      backgroundColor: alpha(cognipaceTokens.accent, 0.1),
      borderColor: alpha(cognipaceTokens.accentSoft, 0.45),
      color: "primary.light",
    },
    "&:focus-visible": {
      backgroundColor: alpha(cognipaceTokens.accent, 0.12),
      outline: `2px solid ${alpha(cognipaceTokens.info, 0.72)}`,
      outlineOffset: 2,
    },
  };
  const mergedSx = (sx ? [baseSx, sx] : baseSx) as SxProps<Theme>;

  return <IconButton size="small" sx={mergedSx} {...rest} />;
}

export function SurfaceTooltip(props: TooltipProps) {
  return (
    <Tooltip
      arrow
      enterDelay={250}
      enterNextDelay={150}
      placement={props.placement ?? "top"}
      {...props}
    />
  );
}

export function InsetSurface(props: {
  children: ReactNode;
  tone?: Tone;
  sx?: object;
}) {
  const tone = props.tone ?? "default";
  const backgroundTone = toneStyles[tone];

  return (
    <Box
      sx={{
        backgroundColor:
          tone === "default"
            ? alpha(cognipaceTokens.backgroundAlt, 0.72)
            : alpha(backgroundTone.color, 0.08),
        border: `1px solid ${
          tone === "default"
            ? alpha(cognipaceTokens.outlineStrong, 0.22)
            : alpha(backgroundTone.color, 0.22)
        }`,
        borderRadius: 1.8,
        p: 1.2,
        ...(props.sx ?? {}),
      }}
    >
      {props.children}
    </Box>
  );
}

export function SurfacePanel(props: {
  children: ReactNode;
  sx?: object;
  variant?: SurfacePanelVariant;
}) {
  const variant = props.variant ?? "chrome";
  const backgroundColor =
    variant === "nested"
      ? alpha(cognipaceTokens.backgroundAlt, 0.72)
      : variant === "solid"
        ? alpha(cognipaceTokens.paperStrong, 0.84)
        : alpha(cognipaceTokens.paperStrong, 0.88);
  const borderColor =
    variant === "nested"
      ? alpha(cognipaceTokens.outlineStrong, 0.22)
      : alpha(cognipaceTokens.outlineStrong, 0.38);
  const boxShadow =
    variant === "nested" ? "none" : "0 22px 54px rgba(0, 0, 0, 0.28)";

  return (
    <Paper
      sx={{
        backgroundColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 2,
        boxSizing: "border-box",
        boxShadow,
        maxWidth: "100%",
        minWidth: 0,
        overflow: "hidden",
        ...(props.sx ?? {}),
      }}
    >
      {props.children}
    </Paper>
  );
}

export function SurfaceTableContainer(props: {
  children: ReactNode;
  sx?: object;
}) {
  return (
    <TableContainer
      component={Paper}
      sx={{
        backgroundColor: alpha(cognipaceTokens.backgroundAlt, 0.86),
        border: `1px solid ${alpha(cognipaceTokens.outlineStrong, 0.38)}`,
        borderRadius: 2,
        boxSizing: "border-box",
        display: "block",
        boxShadow: "0 22px 54px rgba(0, 0, 0, 0.28)",
        maxWidth: "100%",
        minWidth: 0,
        overflow: "auto",
        width: "100%",
        "& .MuiTableCell-root": {
          verticalAlign: "top",
        },
        ...(props.sx ?? {}),
      }}
    >
      {props.children}
    </TableContainer>
  );
}

export function SurfaceDivider(props: { sx?: object }) {
  return (
    <Divider
      sx={{
        borderColor: alpha(cognipaceTokens.outlineStrong, 0.2),
        ...(props.sx ?? {}),
      }}
    />
  );
}

export function SurfaceActionBar(props: { children: ReactNode; sx?: object }) {
  return (
    <Stack
      direction={{ sm: "row", xs: "column" }}
      spacing={1}
      sx={{
        alignItems: { sm: "center", xs: "stretch" },
        flexWrap: "wrap",
        ...(props.sx ?? {}),
      }}
    >
      {props.children}
    </Stack>
  );
}

export function SurfaceFieldGrid(props: {
  children: ReactNode;
  columns?: 1 | 2 | 3;
  sx?: object;
}) {
  const columns = props.columns ?? 2;

  return (
    <Box
      sx={{
        display: "grid",
        gap: 1,
        gridTemplateColumns: {
          md: `repeat(${columns}, minmax(0, 1fr))`,
          xs: "1fr",
        },
        ...(props.sx ?? {}),
      }}
    >
      {props.children}
    </Box>
  );
}

export function SurfaceControlRow(props: {
  control?: ReactNode;
  helper?: ReactNode;
  label?: ReactNode;
  children?: ReactNode;
  sx?: object;
}) {
  if (props.children) {
    return (
      <InsetSurface
        sx={{
          alignItems: "center",
          display: "flex",
          minHeight: 58,
          minWidth: 0,
          px: 1.35,
          py: 1,
          ...(props.sx ?? {}),
        }}
      >
        {props.children}
      </InsetSurface>
    );
  }

  return (
    <InsetSurface
      sx={{
        minHeight: 58,
        minWidth: 0,
        px: 1.35,
        py: 1,
        ...(props.sx ?? {}),
      }}
    >
      <Stack
        alignItems={{ sm: "center", xs: "stretch" }}
        direction={{ sm: "row", xs: "column" }}
        justifyContent="space-between"
        spacing={1.25}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography component="div" variant="body2">
            {props.label}
          </Typography>
          {props.helper ? (
            <Typography color="text.secondary" variant="caption">
              {props.helper}
            </Typography>
          ) : null}
        </Box>
        <Box
          sx={{
            display: "flex",
            flexShrink: 0,
            justifyContent: { sm: "flex-end", xs: "flex-start" },
            minWidth: { sm: 182, xs: "100%" },
          }}
        >
          {props.control}
        </Box>
      </Stack>
    </InsetSurface>
  );
}

export function NumericDisplay(props: {
  children: ReactNode;
  color?: string;
  sx?: object;
}) {
  return (
    <Typography
      sx={{
        color: props.color ?? cognipaceTokens.text,
        fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif',
        fontVariantNumeric: "tabular-nums",
        fontSize: "1.85rem",
        fontWeight: 700,
        letterSpacing: "-0.04em",
        lineHeight: 0.95,
        ...(props.sx ?? {}),
      }}
    >
      {props.children}
    </Typography>
  );
}

export function StatusSurface(props: {
  children: ReactNode;
  tone?: Tone;
  sx?: object;
}) {
  return (
    <InsetSurface
      sx={{
        boxShadow: "none",
        ...(props.sx ?? {}),
      }}
      tone={props.tone}
    >
      {props.children}
    </InsetSurface>
  );
}

export function FieldAssistRow(props: {
  children?: ReactNode;
  id?: string;
  minHeight?: number | string;
  tone?: AssistTone;
}) {
  const tone = props.tone ?? "default";
  const toneStyle = assistToneStyles[tone];

  return (
    <Box
      id={props.id}
      sx={{
        alignItems: "center",
        borderLeft: `1px solid ${toneStyle.border}`,
        color: toneStyle.text,
        display: "flex",
        minHeight: props.minHeight ?? 18,
        pl: 1,
      }}
    >
      <Typography color="inherit" sx={{ lineHeight: 1.35 }} variant="caption">
        {props.children ?? "\u00A0"}
      </Typography>
    </Box>
  );
}

export function InlineStatusRegion(props: {
  id?: string;
  isError?: boolean;
  live?: "assertive" | "off" | "polite";
  message?: string;
  minHeight?: number | string;
  reserveSpace?: boolean;
}) {
  const tone = props.isError ? "danger" : "info";
  const minHeight = props.minHeight ?? 38;

  if (!props.message && !props.reserveSpace) {
    return null;
  }

  return (
    <Box
      aria-atomic="true"
      aria-live={props.live ?? "polite"}
      id={props.id}
      role={props.isError ? "alert" : "status"}
      sx={{
        minHeight,
      }}
    >
      {props.message ? (
        <StatusSurface sx={{ minHeight, px: 1.2, py: 0.9 }} tone={tone}>
          <Typography
            color={props.isError ? "error.main" : "text.primary"}
            sx={{ lineHeight: 1.35 }}
            variant="body2"
          >
            {props.message}
          </Typography>
        </StatusSurface>
      ) : (
        <Box sx={{ minHeight }} />
      )}
    </Box>
  );
}

export function SurfaceNavButton(props: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  const { active, children, onClick } = props;

  return (
    <Button
      aria-current={active ? "page" : undefined}
      fullWidth
      onClick={onClick}
      sx={{
        backgroundColor: active ? alpha(cognipaceTokens.accent, 0.12) : "transparent",
        borderColor: active ? "primary.light" : alpha(cognipaceTokens.outlineStrong, 0.22),
        boxShadow: "none",
        color: active ? "primary.light" : "text.secondary",
        justifyContent: "flex-start",
        minHeight: 38,
        px: 1.5,
        transition: "all 160ms ease",
        "&:hover": {
          backgroundColor: active
            ? alpha(cognipaceTokens.accent, 0.16)
            : alpha(cognipaceTokens.mutedText, 0.08),
          borderColor: active
            ? alpha(cognipaceTokens.accentSoft, 0.6)
            : alpha(cognipaceTokens.outlineStrong, 0.45),
          color: active ? "primary.light" : "text.primary",
        },
      }}
      variant={active ? "contained" : "outlined"}
    >
      {children}
    </Button>
  );
}

export function SurfaceCard(props: {
  label?: string;
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  compact?: boolean;
  sx?: object;
}) {
  const { action, children, compact = false, label, sx, title } = props;

  return (
    <Card sx={{ minWidth: 0, ...(sx ?? {}) }}>
      <CardContent
        sx={{
          p: compact ? 2 : 2.25,
          "&:last-child": { pb: compact ? 2 : 2.25 },
        }}
      >
        <Stack spacing={compact ? 1.5 : 2}>
          {(label || title || action) && (
            <Stack
              alignItems="flex-start"
              direction="row"
              justifyContent="space-between"
              spacing={1.5}
            >
              <Box>
                {label ? (
                  <SurfaceSectionLabel>{label}</SurfaceSectionLabel>
                ) : null}
                {title ? (
                  <Typography component="h2" variant={compact ? "h6" : "h5"}>
                    {title}
                  </Typography>
                ) : null}
              </Box>
              {action}
            </Stack>
          )}
          {children}
        </Stack>
      </CardContent>
    </Card>
  );
}

export const ToneChip = memo(function ToneChip(props: {
  label: string;
  tone?: Tone;
}) {
  const tone = props.tone ?? "default";

  return (
    <Chip
      label={props.label}
      size="small"
      sx={{
        ...toneStyles[tone],
        border: `1px solid ${alpha("#ffffff", 0.04)}`,
      }}
    />
  );
});

export const ProgressTrack = memo(function ProgressTrack(props: {
  value: number;
}) {
  return (
    <LinearProgress
      value={Math.max(0, Math.min(100, props.value))}
      variant="determinate"
    />
  );
});

export const MetricCard = memo(function MetricCard(props: {
  label: string;
  value: string | number;
  caption?: string;
}) {
  return (
    <SurfaceCard compact>
      <Stack spacing={0.5}>
        <SurfaceSectionLabel>{props.label}</SurfaceSectionLabel>
        <NumericDisplay sx={{ fontSize: "1.85rem" }}>
          {props.value}
        </NumericDisplay>
        {props.caption ? (
          <Typography color="text.secondary" variant="body2">
            {props.caption}
          </Typography>
        ) : null}
      </Stack>
    </SurfaceCard>
  );
});

export const StatusBanner = memo(function StatusBanner(props: {
  message: string;
  isError?: boolean;
}) {
  if (!props.message) {
    return null;
  }

  return (
    <Alert
      aria-atomic="true"
      aria-live="polite"
      role={props.isError ? "alert" : "status"}
      severity={props.isError ? "error" : "info"}
      variant="filled"
    >
      {props.message}
    </Alert>
  );
});
