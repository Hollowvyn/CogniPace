import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { memo } from "react";

import { cognipaceTokens } from "../theme";

import { CogniPaceIcon } from "./CogniPaceIcon";

export interface BrandMarkProps {
  /** "full" pairs the icon-in-chip with the "CogniPace" wordmark — the default
   *  for headers and rails. "compact" is the icon-in-chip alone, used where
   *  space is tight (e.g. the docked overlay pill on LeetCode pages). */
  variant?: "full" | "compact";
  /** Optional small line under the wordmark in "full" variant. */
  subtitle?: string;
}

const chipSx = {
  alignItems: "center",
  background: `linear-gradient(135deg, ${alpha(cognipaceTokens.accent, 0.22)}, ${alpha(cognipaceTokens.accentSoft, 0.08)})`,
  borderRadius: "10px",
  boxShadow: `inset 0 0 0 1px ${alpha(cognipaceTokens.accentSoft, 0.12)}`,
  color: "primary.light",
  display: "inline-flex",
  flexShrink: 0,
  height: 32,
  justifyContent: "center",
  width: 32,
} as const;

export const BrandMark = memo(function BrandMark({
  variant = "full",
  subtitle,
}: BrandMarkProps) {
  if (variant === "compact") {
    return (
      <Box aria-label="CogniPace" role="img" sx={chipSx}>
        <CogniPaceIcon />
      </Box>
    );
  }

  return (
    <Stack alignItems="center" direction="row" spacing={1.25}>
      <Box aria-hidden="true" sx={chipSx}>
        <CogniPaceIcon />
      </Box>
      <Stack spacing={0}>
        <Typography
          component="span"
          sx={{
            color: cognipaceTokens.accent,
            fontFamily:
              '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif',
            fontSize: "1.02rem",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
          }}
          translate="no"
        >
          CogniPace
        </Typography>
        {subtitle ? (
          <Typography
            color="text.secondary"
            sx={{ fontSize: "0.78rem", lineHeight: 1.3 }}
            variant="body2"
          >
            {subtitle}
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  );
});
