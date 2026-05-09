import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ReactNode } from "react";

import { SurfaceSectionLabel } from "../labels/SurfaceSectionLabel";

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
