import Box from "@mui/material/Box";
import { alpha } from "@mui/material/styles";
import { memo } from "react";

import { cognipaceTokens } from "../theme";

import { CogniPaceIcon } from "./CogniPaceIcon";

export const BrandMark = memo(function BrandMark() {
  return (
    <Box
      aria-label="CogniPace"
      role="img"
      sx={{
        alignItems: "center",
        background: `linear-gradient(135deg, ${alpha(cognipaceTokens.accent, 0.22)}, ${alpha(cognipaceTokens.accentSoft, 0.08)})`,
        borderRadius: "10px",
        boxShadow: `inset 0 0 0 1px ${alpha(cognipaceTokens.accentSoft, 0.12)}`,
        color: "primary.light",
        display: "inline-flex",
        height: 32,
        justifyContent: "center",
        width: 32,
      }}
    >
      <CogniPaceIcon />
    </Box>
  );
});
