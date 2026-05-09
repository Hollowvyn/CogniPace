import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ReactNode } from "react";

import {
  SurfaceActionBar,
  SurfaceControlRow,
  SurfaceFieldGrid,
  SurfacePanel,
  SurfaceSectionLabel,
} from "../../../../../components";

type SettingsSectionWidth = "full" | "half" | "narrow" | "wide";
type SettingsSectionTone = "danger" | "default";

const sectionColumns: Record<SettingsSectionWidth, { md: string; xs: string }> =
  {
    full: { md: "1 / -1", xs: "1 / -1" },
    half: { md: "span 6", xs: "1 / -1" },
    narrow: { md: "span 5", xs: "1 / -1" },
    wide: { md: "span 7", xs: "1 / -1" },
  };

export function SettingsCanvas(props: { children: ReactNode }) {
  return (
    <Stack spacing={2} sx={{ width: "100%" }}>
      {props.children}
    </Stack>
  );
}

export function SettingsGrid(props: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: { md: 1.75, xs: 1.4 },
        gridTemplateColumns: { md: "repeat(12, minmax(0, 1fr))", xs: "1fr" },
        width: "100%",
      }}
    >
      {props.children}
    </Box>
  );
}

export function SettingsSection(props: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
  tone?: SettingsSectionTone;
  width: SettingsSectionWidth;
}) {
  const isDanger = props.tone === "danger";

  return (
    <SurfacePanel
      variant={isDanger ? "solid" : "chrome"}
      sx={{
        gridColumn: {
          md: sectionColumns[props.width].md,
          xs: sectionColumns[props.width].xs,
        },
        minWidth: 0,
        p: { md: 2.25, xs: 1.75 },
      }}
    >
      <Stack spacing={1.55}>
        <Box>
          <SurfaceSectionLabel>{props.eyebrow}</SurfaceSectionLabel>
          <Typography component="h2" variant="h6">
            {props.title}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.35 }} variant="body2">
            {props.description}
          </Typography>
        </Box>
        {props.children}
      </Stack>
    </SurfacePanel>
  );
}

export function SettingsFieldGrid(props: {
  children: ReactNode;
  columns?: 1 | 2 | 3;
}) {
  return (
    <SurfaceFieldGrid columns={props.columns}>
      {props.children}
    </SurfaceFieldGrid>
  );
}

export function SettingsActionSection(props: { children: ReactNode }) {
  return <SurfaceActionBar>{props.children}</SurfaceActionBar>;
}

export function SettingsRow(props: {
  control: ReactNode;
  helper?: ReactNode;
  label: ReactNode;
}) {
  return (
    <SurfaceControlRow
      control={props.control}
      helper={props.helper}
      label={props.label}
    />
  );
}
