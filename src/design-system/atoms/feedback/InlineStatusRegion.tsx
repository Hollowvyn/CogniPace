import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { StatusSurface } from "./StatusSurface";

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
