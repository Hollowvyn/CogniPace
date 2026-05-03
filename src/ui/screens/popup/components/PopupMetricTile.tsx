import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import {
  NumericDisplay,
  SurfaceCard,
  SurfaceSectionLabel,
} from "../../../components";

export interface PopupMetricTileProps {
  accent?: string;
  label: string;
  suffix?: string;
  value: number | string;
}

export function PopupMetricTile(props: PopupMetricTileProps) {
  return (
    <SurfaceCard compact>
      <Stack spacing={0.55}>
        <SurfaceSectionLabel>{props.label}</SurfaceSectionLabel>
        <Stack alignItems="baseline" direction="row" spacing={0.55}>
          <NumericDisplay color={props.accent}>{props.value}</NumericDisplay>
          {props.suffix ? (
            <Typography
              color="text.secondary"
              sx={{
                fontSize: "0.66rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {props.suffix}
            </Typography>
          ) : null}
        </Stack>
      </Stack>
    </SurfaceCard>
  );
}
