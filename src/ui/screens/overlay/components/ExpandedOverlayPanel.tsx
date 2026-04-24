import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import {useEffect, useRef} from "react";

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
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) {
      return;
    }

    const ownerDocument = surface.ownerDocument;
    const handlePointerDown = (event: PointerEvent) => {
      const eventTarget = event.target;
      const path = typeof event.composedPath === "function"
        ? event.composedPath()
        : [];
      const clickedInsideOverlay =
        path.includes(surface) ||
        (eventTarget instanceof Node && surface.contains(eventTarget));

      if (!clickedInsideOverlay) {
        props.model.onClickAway();
      }
    };

    ownerDocument.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      ownerDocument.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [props.model]);

  return (
    <Paper
      ref={surfaceRef}
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
          {props.model.feedback ? (
            <OverlayFeedbackSurface feedback={props.model.feedback}/>
          ) : null}
          <ExpandedOverlayTimerCard timer={props.model.timer}/>
          <AssessmentRail
            assessment={props.model.assessment}
            assist={props.model.assessmentAssist}
          />
          <OverlayLogFields log={props.model.log}/>
          <ExpandedOverlayActions
            actions={props.model.actions}
            assist={props.model.actionAssist}
          />
        </Stack>
      </Box>
    </Paper>
  );
}
