import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { ReactNode } from "react";

import { Tone } from "../presentation/studyState";
import { kineticTokens } from "../theme";

const toneStyles: Record<Tone, { background: string; color: string }> = {
  default: {
    background: alpha(kineticTokens.mutedText, 0.12),
    color: kineticTokens.mutedText,
  },
  accent: {
    background: alpha(kineticTokens.accent, 0.16),
    color: kineticTokens.accentSoft,
  },
  info: {
    background: alpha(kineticTokens.info, 0.16),
    color: kineticTokens.info,
  },
  success: {
    background: alpha(kineticTokens.success, 0.16),
    color: kineticTokens.success,
  },
  danger: {
    background: alpha(kineticTokens.danger, 0.16),
    color: kineticTokens.danger,
  },
};

export function BrandMark() {
  return (
    <Box
      sx={{
        alignItems: "center",
        background: `linear-gradient(135deg, ${alpha(kineticTokens.accent, 0.22)}, ${alpha(kineticTokens.accentSoft, 0.08)})`,
        borderRadius: "10px",
        boxShadow: `inset 0 0 0 1px ${alpha(kineticTokens.accentSoft, 0.12)}`,
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
}

export function SurfaceCard(props: {
  label?: string;
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  compact?: boolean;
}) {
  const { action, children, compact = false, label, title } = props;

  return (
    <Card>
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
                  <Typography color="text.secondary" variant="overline">
                    {label}
                  </Typography>
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

export function ToneChip(props: { label: string; tone?: Tone }) {
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
}

export function ProgressTrack(props: { value: number }) {
  return (
    <LinearProgress
      value={Math.max(0, Math.min(100, props.value))}
      variant="determinate"
    />
  );
}

export function MetricCard(props: {
  label: string;
  value: string | number;
  caption: string;
}) {
  return (
    <SurfaceCard compact>
      <Stack spacing={0.5}>
        <Typography color="text.secondary" variant="overline">
          {props.label}
        </Typography>
        <Typography variant="h4">{props.value}</Typography>
        <Typography color="text.secondary" variant="body2">
          {props.caption}
        </Typography>
      </Stack>
    </SurfaceCard>
  );
}

export function StatusBanner(props: { message: string; isError?: boolean }) {
  if (!props.message) {
    return null;
  }

  return (
    <Alert severity={props.isError ? "error" : "info"} variant="filled">
      {props.message}
    </Alert>
  );
}
