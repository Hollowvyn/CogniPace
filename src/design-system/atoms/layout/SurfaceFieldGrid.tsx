import Box from "@mui/material/Box";
import { ReactNode } from "react";

export function SurfaceFieldGrid(props: {
  children: ReactNode;
  columns?: 1 | 2 | 3;
  sx?: object;
}) {
  const columns = props.columns ?? 2;

  return (
    <Box
      sx={{
        display: "grid",
        gap: 1,
        gridTemplateColumns: {
          md: `repeat(${columns}, minmax(0, 1fr))`,
          xs: "1fr",
        },
        ...(props.sx ?? {}),
      }}
    >
      {props.children}
    </Box>
  );
}
