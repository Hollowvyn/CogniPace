import LinearProgress from "@mui/material/LinearProgress";
import { memo } from "react";

export const ProgressTrack = memo(function ProgressTrack(props: {
  value: number;
}) {
  return (
    <LinearProgress
      value={Math.max(0, Math.min(100, props.value))}
      variant="determinate"
    />
  );
});
