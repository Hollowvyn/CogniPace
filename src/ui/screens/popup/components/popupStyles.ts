import {alpha} from "@mui/material/styles";

import {kineticTokens} from "../../../theme";

export const popupShellSx = {
  backgroundColor: alpha(kineticTokens.backgroundAlt, 0.96),
  border: `1px solid ${alpha(kineticTokens.outlineStrong, 0.45)}`,
  borderRadius: 2.4,
  boxShadow: "0 24px 52px rgba(0, 0, 0, 0.34)",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflow: "hidden",
};

export const popupActionButtonSx = {
  minHeight: 42,
  touchAction: "manipulation",
  "&:focus-visible": {
    outline: `2px solid ${alpha(kineticTokens.info, 0.72)}`,
    outlineOffset: 2,
  },
};

export const popupSmallButtonSx = {
  borderRadius: 999,
  minHeight: 28,
  px: 1.05,
  py: 0.2,
  touchAction: "manipulation",
  "&:focus-visible": {
    outline: `2px solid ${alpha(kineticTokens.info, 0.72)}`,
    outlineOffset: 2,
  },
};
