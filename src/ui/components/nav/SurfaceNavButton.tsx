import Button, { ButtonProps } from "@mui/material/Button";
import { alpha, Theme } from "@mui/material/styles";
import { SxProps } from "@mui/system";

import { cognipaceControlScale, cognipaceTokens } from "../../theme";

export interface SurfaceNavButtonProps extends Omit<ButtonProps, "variant"> {
  active?: boolean;
}

export function SurfaceNavButton(props: SurfaceNavButtonProps) {
  const { active, children, sx, ...rest } = props;

  const baseSx: SxProps<Theme> = {
    backgroundColor: active ? alpha(cognipaceTokens.accent, 0.12) : "transparent",
    borderColor: active
      ? "primary.light"
      : alpha(cognipaceTokens.outlineStrong, 0.22),
    boxShadow: "none",
    color: active ? "primary.light" : "text.secondary",
    justifyContent: "flex-start",
    minHeight: cognipaceControlScale.navButtonMinHeight,
    paddingInline: cognipaceControlScale.navButtonInlinePadding,
    transition:
      "border-color 160ms ease, background-color 160ms ease, color 160ms ease",
    "@media (prefers-reduced-motion: reduce)": {
      transition: "none",
    },
    "&:hover": {
      backgroundColor: active
        ? alpha(cognipaceTokens.accent, 0.16)
        : alpha(cognipaceTokens.mutedText, 0.08),
      borderColor: active
        ? alpha(cognipaceTokens.accentSoft, 0.6)
        : alpha(cognipaceTokens.outlineStrong, 0.45),
      color: active ? "primary.light" : "text.primary",
    },
    "&:focus-visible": {
      outline: `2px solid ${alpha(cognipaceTokens.info, 0.72)}`,
      outlineOffset: 2,
    },
  };
  const mergedSx = (sx ? [baseSx, sx] : baseSx) as SxProps<Theme>;

  return (
    <Button
      fullWidth
      {...rest}
      aria-current={active ? "page" : undefined}
      sx={mergedSx}
      variant={active ? "contained" : "outlined"}
    >
      {children}
    </Button>
  );
}
