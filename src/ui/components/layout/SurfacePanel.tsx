import Paper from "@mui/material/Paper";
import { alpha } from "@mui/material/styles";
import { ReactNode } from "react";

import { cognipaceTokens } from "../../theme";

type SurfacePanelVariant = "chrome" | "solid";

/**
 * Top-level chrome panel (shadowed Paper). Use for cards, dialogs, save bars,
 * primary screen surfaces. For recessed sub-regions inside a SurfacePanel,
 * use InsetSurface.
 */
export function SurfacePanel(props: {
  children: ReactNode;
  sx?: object;
  variant?: SurfacePanelVariant;
}) {
  const variant = props.variant ?? "chrome";
  const backgroundColor =
    variant === "solid"
      ? alpha(cognipaceTokens.paperStrong, 0.84)
      : alpha(cognipaceTokens.paperStrong, 0.88);

  return (
    <Paper
      sx={{
        backgroundColor,
        border: `1px solid ${alpha(cognipaceTokens.outlineStrong, 0.38)}`,
        borderRadius: 2,
        boxSizing: "border-box",
        boxShadow: "0 22px 54px rgba(0, 0, 0, 0.28)",
        maxWidth: "100%",
        minWidth: 0,
        overflow: "hidden",
        ...(props.sx ?? {}),
      }}
    >
      {props.children}
    </Paper>
  );
}
