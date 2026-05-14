import Stack from "@mui/material/Stack";
import { ReactNode } from "react";

export function SurfaceActionBar(props: { children: ReactNode; sx?: object }) {
  return (
    <Stack
      direction={{ sm: "row", xs: "column" }}
      spacing={1}
      sx={{
        alignItems: { sm: "center", xs: "stretch" },
        flexWrap: "wrap",
        ...(props.sx ?? {}),
      }}
    >
      {props.children}
    </Stack>
  );
}
