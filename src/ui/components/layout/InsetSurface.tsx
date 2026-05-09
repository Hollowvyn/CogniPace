import Box from "@mui/material/Box";
import { alpha } from "@mui/material/styles";
import { ReactNode } from "react";

import { Tone } from "../../presentation/studyState";
import { cognipaceTokens } from "../../theme";
import { toneStyles } from "../tone";

/**
 * Recessed sub-surface intended to live inside a SurfacePanel. Tone-aware,
 * has built-in padding (p: 1.2). Not for top-level chrome — use SurfacePanel
 * for that.
 */
export function InsetSurface(props: {
  children: ReactNode;
  tone?: Tone;
  sx?: object;
}) {
  const tone = props.tone ?? "default";
  const backgroundTone = toneStyles[tone];

  return (
    <Box
      sx={{
        backgroundColor:
          tone === "default"
            ? alpha(cognipaceTokens.backgroundAlt, 0.72)
            : alpha(backgroundTone.color, 0.08),
        border: `1px solid ${
          tone === "default"
            ? alpha(cognipaceTokens.outlineStrong, 0.22)
            : alpha(backgroundTone.color, 0.22)
        }`,
        borderRadius: 1.8,
        p: 1.2,
        ...(props.sx ?? {}),
      }}
    >
      {props.children}
    </Box>
  );
}
