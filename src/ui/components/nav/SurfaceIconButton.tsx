import IconButton, { IconButtonProps } from "@mui/material/IconButton";
import { alpha, Theme } from "@mui/material/styles";
import { SxProps } from "@mui/system";

import { cognipaceControlScale, cognipaceTokens } from "../../theme";

export function SurfaceIconButton(props: IconButtonProps) {
  const { sx, ...rest } = props;
  const baseSx: SxProps<Theme> = {
    backgroundColor: alpha(cognipaceTokens.mutedText, 0.08),
    border: `1px solid ${alpha(cognipaceTokens.outlineStrong, 0.34)}`,
    borderRadius: 1.15,
    color: "text.secondary",
    height: cognipaceControlScale.iconButtonSize,
    transition:
      "border-color 160ms ease, background-color 160ms ease, color 160ms ease",
    width: cognipaceControlScale.iconButtonSize,
    "@media (prefers-reduced-motion: reduce)": {
      transition: "none",
    },
    "&:hover": {
      backgroundColor: alpha(cognipaceTokens.accent, 0.1),
      borderColor: alpha(cognipaceTokens.accentSoft, 0.45),
      color: "primary.light",
    },
    "&:focus-visible": {
      backgroundColor: alpha(cognipaceTokens.accent, 0.12),
      outline: `2px solid ${alpha(cognipaceTokens.info, 0.72)}`,
      outlineOffset: 2,
    },
  };
  const mergedSx = (sx ? [baseSx, sx] : baseSx) as SxProps<Theme>;

  return <IconButton size="small" sx={mergedSx} {...rest} />;
}
