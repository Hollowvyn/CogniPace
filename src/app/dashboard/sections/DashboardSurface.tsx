/** Dashboard-specific surface primitives composed from the shared CogniPace theme. */
import {
  SurfacePanel,
} from "@design-system/atoms";
import { cognipaceTokens } from "@design-system/theme";
import Box from "@mui/material/Box";
import { alpha } from "@mui/material/styles";
import { ReactNode } from "react";


export function DashboardFrame(props: { children: ReactNode }) {
  return (
    <Box
      sx={{
        boxSizing: "border-box",
        maxWidth: 1440,
        mx: "auto",
        minHeight: "100vh",
        overflowX: "hidden",
        position: "relative",
        px: { md: 4, xs: 2 },
        py: { md: 4, xs: 2 },
        width: "100%",
        "&::before": {
          content: '""',
          position: "fixed",
          inset: 0,
          background: [
            `radial-gradient(circle at 50% 0%, ${alpha(cognipaceTokens.accent, 0.05)}, transparent 40%)`,
            `radial-gradient(circle at 0% 100%, ${alpha(cognipaceTokens.info, 0.04)}, transparent 30%)`,
          ].join(","),
          pointerEvents: "none",
          zIndex: -1,
        },
      }}
    >
      {props.children}
    </Box>
  );
}

export function DashboardRailPanel(props: { children: ReactNode }) {
  return (
    <SurfacePanel
      sx={{
        alignSelf: "flex-start",
        minWidth: { lg: 228 },
        p: 2,
        position: { lg: "sticky" },
        top: { lg: 2 },
        width: { lg: 228, xs: "100%" },
      }}
    >
      {props.children}
    </SurfacePanel>
  );
}

export function DashboardHeaderPanel(props: { children: ReactNode }) {
  return (
    <SurfacePanel sx={{ p: { md: 2, xs: 2 } }}>{props.children}</SurfacePanel>
  );
}

