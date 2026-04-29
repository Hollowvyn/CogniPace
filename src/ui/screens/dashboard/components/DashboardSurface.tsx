/** Dashboard-specific surface primitives composed from the shared kinetic theme. */
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { ReactNode } from "react";

import { InsetSurface, SurfaceSectionLabel } from "../../../components";
import { kineticTokens } from "../../../theme";

export function DashboardFrame(props: { children: ReactNode }) {
  return (
    <Box
      sx={{
        boxSizing: "border-box",
        maxWidth: 1440,
        mx: "auto",
        overflowX: "hidden",
        px: { md: 2.5, xs: 1.25 },
        py: { md: 2.5, xs: 1.25 },
        width: "100%",
      }}
    >
      {props.children}
    </Box>
  );
}

export function DashboardChromePanel(props: {
  children: ReactNode;
  sx?: object;
}) {
  return (
    <Paper
      sx={{
        backgroundColor: alpha(kineticTokens.backgroundAlt, 0.86),
        border: `1px solid ${alpha(kineticTokens.outlineStrong, 0.38)}`,
        borderRadius: 2,
        boxSizing: "border-box",
        boxShadow: "0 22px 54px rgba(0, 0, 0, 0.28)",
        maxWidth: "100%",
        overflow: "hidden",
        ...(props.sx ?? {}),
      }}
    >
      {props.children}
    </Paper>
  );
}

export function DashboardRailPanel(props: { children: ReactNode }) {
  return (
    <DashboardChromePanel
      sx={{
        alignSelf: "flex-start",
        minWidth: { lg: 218 },
        p: 1.75,
        position: { lg: "sticky" },
        top: { lg: 20 },
        width: { lg: 218, xs: "100%" },
      }}
    >
      {props.children}
    </DashboardChromePanel>
  );
}

export function DashboardHeaderPanel(props: { children: ReactNode }) {
  return (
    <DashboardChromePanel
      sx={{
        p: { md: 2.25, xs: 1.75 },
      }}
    >
      {props.children}
    </DashboardChromePanel>
  );
}

export function DashboardSettingsGroup(props: {
  children: ReactNode;
  copy?: string;
  label: string;
  title: string;
}) {
  return (
    <InsetSurface
      sx={{
        backgroundColor: alpha(kineticTokens.backgroundAlt, 0.48),
        p: { md: 1.75, xs: 1.4 },
      }}
    >
      <Stack spacing={1.45}>
        <Box>
          <SurfaceSectionLabel>{props.label}</SurfaceSectionLabel>
          <Typography component="h3" variant="h6">
            {props.title}
          </Typography>
          {props.copy ? (
            <Typography color="text.secondary" variant="body2">
              {props.copy}
            </Typography>
          ) : null}
        </Box>
        {props.children}
      </Stack>
    </InsetSurface>
  );
}

export function DashboardControlRow(props: {
  children: ReactNode;
  sx?: object;
}) {
  return (
    <InsetSurface
      sx={{
        alignItems: "center",
        display: "flex",
        minHeight: 52,
        px: 1.25,
        py: 1,
        ...(props.sx ?? {}),
      }}
    >
      {props.children}
    </InsetSurface>
  );
}

export function DashboardActionBar(props: { children: ReactNode }) {
  return (
    <Stack
      direction={{ md: "row", xs: "column" }}
      spacing={1}
      sx={{
        borderTop: `1px solid ${alpha(kineticTokens.outlineStrong, 0.18)}`,
        pt: 1.5,
      }}
    >
      {props.children}
    </Stack>
  );
}
