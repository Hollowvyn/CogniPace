import Box from "@mui/material/Box";
import { alpha } from "@mui/material/styles";
import { memo } from "react";

import { cognipaceTokens } from "../theme";

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
      <Box
        aria-hidden="true"
        component="svg"
        sx={{ height: 18, width: 18 }}
        viewBox="0 0 24 24"
      >
        <path
          d="M16.5 7.2A6.5 6.5 0 1 0 16.5 16.8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
        <circle cx="17.2" cy="12" fill="currentColor" r="2" />
      </Box>
    </Box>
  );
});
