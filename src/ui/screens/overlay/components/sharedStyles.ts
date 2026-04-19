import {alpha} from "@mui/material/styles";

import {kineticTokens} from "../../../theme";

export const timerTextSx = {
  fontFamily: '"Space Grotesk", "Avenir Next", "Segoe UI", sans-serif',
  fontWeight: 700,
  letterSpacing: "-0.06em",
  lineHeight: 1,
};

export const outlinedChromeIconButtonSx = {
  backgroundColor: alpha(kineticTokens.mutedText, 0.08),
  border: `1px solid ${alpha(kineticTokens.mutedText, 0.16)}`,
  color: "text.secondary",
  "&:hover": {
    backgroundColor: alpha(kineticTokens.mutedText, 0.14),
  },
};
