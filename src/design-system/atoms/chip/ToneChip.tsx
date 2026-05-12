import Chip from "@mui/material/Chip";
import { alpha } from "@mui/material/styles";
import { memo } from "react";

import { Tone } from "../../../ui/presentation/studyState";
import { toneStyles } from "../tone";

export const ToneChip = memo(function ToneChip(props: {
  label: string;
  tone?: Tone;
}) {
  const tone = props.tone ?? "default";

  return (
    <Chip
      label={props.label}
      size="small"
      sx={{
        ...toneStyles[tone],
        border: `1px solid ${alpha("#ffffff", 0.04)}`,
      }}
    />
  );
});
