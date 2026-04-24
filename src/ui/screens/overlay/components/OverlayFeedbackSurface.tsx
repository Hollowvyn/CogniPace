import Typography from "@mui/material/Typography";

import {StatusSurface} from "../../../components";
import {OverlayFeedbackViewModel} from "../overlayPanel.types";

export function OverlayFeedbackSurface(
  props: {
    feedback: OverlayFeedbackViewModel;
  }
) {
  return (
    <StatusSurface tone={props.feedback.isError ? "danger" : "accent"}>
      <Typography
        color={props.feedback.isError ? "error.main" : "text.primary"}
        variant="body2"
      >
        {props.feedback.message}
      </Typography>
    </StatusSurface>
  );
}
