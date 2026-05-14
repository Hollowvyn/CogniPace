import LinearProgress from "@mui/material/LinearProgress";
import { memo } from "react";

export const ProgressTrack = memo(function ProgressTrack(props: {
  value: number;
  /**
   * Accessible name announced by screen readers. Required for axe:
   * the underlying `role="progressbar"` element must have either
   * `aria-label` or `aria-labelledby`.
   */
  ariaLabel: string;
}) {
  return (
    <LinearProgress
      aria-label={props.ariaLabel}
      value={Math.max(0, Math.min(100, props.value))}
      variant="determinate"
    />
  );
});
