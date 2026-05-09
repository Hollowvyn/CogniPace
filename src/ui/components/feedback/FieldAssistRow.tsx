import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ReactNode } from "react";

import { AssistTone, assistToneStyles } from "../tone";

export function FieldAssistRow(props: {
  children?: ReactNode;
  id?: string;
  minHeight?: number | string;
  tone?: AssistTone;
}) {
  const tone = props.tone ?? "default";
  const toneStyle = assistToneStyles[tone];

  return (
    <Box
      id={props.id}
      sx={{
        alignItems: "center",
        borderLeft: `1px solid ${toneStyle.border}`,
        color: toneStyle.text,
        display: "flex",
        minHeight: props.minHeight ?? 18,
        pl: 1,
      }}
    >
      <Typography color="inherit" sx={{ lineHeight: 1.35 }} variant="caption">
        {props.children ?? " "}
      </Typography>
    </Box>
  );
}
