import {cognipaceControlScale, cognipaceTokens} from "@design-system/theme";
import {alpha} from "@mui/material/styles";


export const popupShellSx = {
  backgroundColor: alpha(cognipaceTokens.backgroundAlt, 0.96),
  border: `1px solid ${alpha(cognipaceTokens.outlineStrong, 0.45)}`,
  borderRadius: 2.4,
  boxShadow: "0 24px 52px rgba(0, 0, 0, 0.34)",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflow: "hidden",
};

export const popupSmallButtonSx = {
  borderRadius: 999,
  minHeight: cognipaceControlScale.compactPillMinHeight,
  paddingBlock: 1,
  paddingInline: 9,
  touchAction: "manipulation",
  "&:focus-visible": {
    outline: `2px solid ${alpha(cognipaceTokens.info, 0.72)}`,
    outlineOffset: 2,
  },
};
