import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ReactNode } from "react";

import { InsetSurface } from "./InsetSurface";

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
          minHeight: 52,
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
        minHeight: 52,
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
