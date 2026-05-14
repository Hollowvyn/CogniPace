import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { memo } from "react";

import { NumericDisplay } from "../chip/NumericDisplay";
import { SurfaceSectionLabel } from "../labels/SurfaceSectionLabel";

import { SurfaceCard } from "./SurfaceCard";

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
