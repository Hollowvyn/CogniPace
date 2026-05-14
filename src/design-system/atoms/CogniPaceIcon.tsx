import Box from "@mui/material/Box";

// Path data is mirrored in public/icons/icon.svg (the asset shipped to the
// Chrome manifest, favicon, and notifications). Update both together.
const COGNIPACE_ICON_PATH_D =
  "M38 20A18 18 0 1 0 38 44M19 32L55 32M47 24L55 32L47 40";

const COGNIPACE_ICON_VIEWBOX = "0 0 64 64";

export interface CogniPaceIconProps {
  /** Render size in px. Defaults to 18 to match the in-chip mark. */
  size?: number;
  /** Stroke width in viewBox units. Defaults to 6 (≈9.4% of the 64-unit grid). */
  strokeWidth?: number;
  className?: string;
}

/** The CogniPace mark — C-shape with a forward arrow. Inherits `color` via
 *  `currentColor` so the consumer controls the stroke through CSS. */
export function CogniPaceIcon({
  size = 18,
  strokeWidth = 6,
  className,
}: CogniPaceIconProps) {
  return (
    <Box
      aria-hidden="true"
      className={className}
      component="svg"
      sx={{ height: size, width: size }}
      viewBox={COGNIPACE_ICON_VIEWBOX}
    >
      <path
        d={COGNIPACE_ICON_PATH_D}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </Box>
  );
}
