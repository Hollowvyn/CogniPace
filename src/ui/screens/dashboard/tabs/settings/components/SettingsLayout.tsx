import { SurfaceCard } from "@design-system/atoms";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ReactNode } from "react";


type SettingsSectionWidth = "full" | "half" | "narrow" | "wide";

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
        gap: { md: 2, xs: 2 },
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
  width: SettingsSectionWidth;
}) {
  return (
    <SurfaceCard
      label={props.eyebrow}
      title={props.title}
      sx={{
        gridColumn: {
          md: sectionColumns[props.width].md,
          xs: sectionColumns[props.width].xs,
        },
      }}
    >
      <Typography color="text.secondary" variant="body2" sx={{ mt: -0.5, mb: 1.5 }}>
        {props.description}
      </Typography>
      <Stack spacing={1.5}>
        {props.children}
      </Stack>
    </SurfaceCard>
  );
}

