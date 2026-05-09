import Typography from "@mui/material/Typography";
import { ReactNode } from "react";

export function SurfaceSectionLabel(props: { children: ReactNode }) {
  return (
    <Typography
      color="text.secondary"
      sx={{
        fontSize: "0.64rem",
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
      }}
    >
      {props.children}
    </Typography>
  );
}
