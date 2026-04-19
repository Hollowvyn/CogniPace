import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";

import {ExpandedOverlayViewModel} from "../overlayPanel.types";

import {AssessmentRail} from "./AssessmentRail";
import {ExpandedOverlayActions} from "./ExpandedOverlayActions";
import {ExpandedOverlayHeader} from "./ExpandedOverlayHeader";
import {ExpandedOverlayTimerCard} from "./ExpandedOverlayTimerCard";
import {OverlayFeedbackSurface} from "./OverlayFeedbackSurface";
import {OverlayLogFields} from "./OverlayLogFields";

export function ExpandedOverlayPanel(
  props: {
    model: ExpandedOverlayViewModel;
  }
) {
  return (
    <Paper
      sx={{
        border: (theme) => `1px solid ${theme.palette.divider}`,
        borderRadius: 1.5,
        overflow: "hidden",
        width: 392,
      }}
    >
      <ExpandedOverlayHeader header={props.model.header}/>

      <Box sx={{p: 2}}>
        <Stack spacing={2}>
          <ExpandedOverlayTimerCard timer={props.model.timer}/>
          <AssessmentRail assessment={props.model.assessment}/>
          <OverlayLogFields log={props.model.log}/>
          <ExpandedOverlayActions actions={props.model.actions}/>
          {props.model.feedback ? (
            <OverlayFeedbackSurface feedback={props.model.feedback}/>
          ) : null}
        </Stack>
      </Box>
    </Paper>
  );
}
