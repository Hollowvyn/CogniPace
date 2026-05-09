import Box from "@mui/material/Box";
import {alpha} from "@mui/material/styles";

import {cognipaceTokens} from "../../../theme";

export function PopupBrandMark() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        alignItems: "center",
        color: cognipaceTokens.accent,
        display: "grid",
        gap: 0.25,
        gridTemplateColumns: "repeat(2, 10px)",
        gridTemplateRows: "repeat(2, 10px)",
        height: 24,
        justifyContent: "center",
        width: 24,
      }}
    >
      {[0, 1, 2, 3].map((index) => (
        <Box
          key={index}
          sx={{
            backgroundColor: index === 3
              ? alpha(cognipaceTokens.accent, 0.88)
              : cognipaceTokens.accent,
            borderRadius: 0.15,
            boxShadow: `0 0 0 1px ${alpha(cognipaceTokens.accentSoft, 0.08)}`,
            height: 10,
            width: 10,
          }}
        />
      ))}
    </Box>
  );
}
