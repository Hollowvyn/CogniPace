import { cognipaceTokens } from "@design-system/theme";
import Typography from "@mui/material/Typography";
import { ReactNode } from "react";


export function NumericDisplay(props: {
  children: ReactNode;
  color?: string;
  sx?: object;
}) {
  return (
    <Typography
      sx={{
        color: props.color ?? cognipaceTokens.text,
        fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif',
        fontVariantNumeric: "tabular-nums",
        fontSize: "1.85rem",
        fontWeight: 700,
        letterSpacing: "-0.04em",
        lineHeight: 0.95,
        ...(props.sx ?? {}),
      }}
    >
      {props.children}
    </Typography>
  );
}
