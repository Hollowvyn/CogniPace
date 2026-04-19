import Paper from "@mui/material/Paper";
import {alpha} from "@mui/material/styles";
import Typography from "@mui/material/Typography";

import {kineticTokens} from "../../../theme";
import {OverlayFeedbackViewModel} from "../overlayPanel.types";

export function OverlayFeedbackSurface(
  props: {
    feedback: OverlayFeedbackViewModel;
  }
) {
  return (
    <Paper
      sx={{
        backgroundColor: props.feedback.isError
          ? alpha(kineticTokens.danger, 0.08)
          : alpha(kineticTokens.backgroundAlt, 0.92),
        border: `1px solid ${
          props.feedback.isError
            ? alpha(kineticTokens.danger, 0.2)
            : alpha(kineticTokens.accent, 0.12)
        }`,
        borderRadius: 2.25,
        p: 1.25,
      }}
    >
      <Typography
        color={props.feedback.isError ? "error.main" : "text.primary"}
        variant="body2"
      >
        {props.feedback.message}
      </Typography>
    </Paper>
  );
}
