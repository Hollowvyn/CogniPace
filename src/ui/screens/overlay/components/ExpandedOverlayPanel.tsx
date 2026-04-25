import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import {useEffect, useRef} from "react";

import {ExpandedOverlayViewModel} from "../overlayPanel.types";

import {AssessmentRail} from "./AssessmentRail";
import {ExpandedOverlayActions} from "./ExpandedOverlayActions";
import {ExpandedOverlayHeader, ExpandedOverlayStatus} from "./ExpandedOverlayHeader";
import {ExpandedOverlayTimerCard} from "./ExpandedOverlayTimerCard";
import {OverlayFeedbackSurface} from "./OverlayFeedbackSurface";
import {OverlayLogFields} from "./OverlayLogFields";
import {OverlayPostSubmitNextCard} from "./OverlayPostSubmitNextCard";

export function ExpandedOverlayPanel(
  props: {
    model: ExpandedOverlayViewModel;
  }
) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  const onClickAwayRef = useRef(props.model.onClickAway);

  useEffect(() => {
    onClickAwayRef.current = props.model.onClickAway;
  });

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
        onClickAwayRef.current();
      }
    };

    ownerDocument.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      ownerDocument.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, []);

  return (
    <Paper
      data-testid="expanded-overlay-panel"
      ref={surfaceRef}
      sx={{
        border: (theme) => `1px solid ${theme.palette.divider}`,
        borderRadius: 1.5,
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 10px)",
        overflow: "hidden",
        width: 392,
      }}
    >
      <ExpandedOverlayHeader header={props.model.header}/>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overscrollBehavior: "contain",
          p: 2,
        }}
      >
        <Stack spacing={2}>
          <ExpandedOverlayStatus header={props.model.header}/>
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
          <OverlayPostSubmitNextCard nextTarget={props.model.postSubmitNext}/>
        </Stack>
      </Box>
    </Paper>
  );
}
