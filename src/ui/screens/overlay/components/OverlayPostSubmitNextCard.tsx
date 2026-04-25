import Collapse from "@mui/material/Collapse";
import Fade from "@mui/material/Fade";
import Stack from "@mui/material/Stack";
import {useEffect, useRef} from "react";

import {FieldAssistRow, SurfaceCard} from "../../../components";
import {CourseNextCard} from "../../../features/courses/CourseNextCard";
import {RecommendedProblemCard} from "../../../features/recommended/RecommendedProblemCard";
import {OverlayPostSubmitNextViewModel} from "../overlayPanel.types";

export function OverlayPostSubmitNextCard(
  props: {
    nextTarget: OverlayPostSubmitNextViewModel | null;
  }
) {
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!props.nextTarget || !section) {
      return;
    }

    if (typeof section.scrollIntoView === "function") {
      section.scrollIntoView({block: "nearest"});
    }
  }, [props.nextTarget]);

  return (
    <Collapse in={props.nextTarget !== null} timeout={180} unmountOnExit>
      <Fade in={props.nextTarget !== null} timeout={180}>
        <div ref={sectionRef}>
          {props.nextTarget?.kind === "course" ? (
            <CourseNextCard
              actionLabel="Open next"
              activeCourseId={props.nextTarget.activeCourseId}
              buttonFullWidth
              compact
              label="Next In Study Mode"
              onOpenProblem={props.nextTarget.onOpenProblem}
              view={props.nextTarget.view}
            />
          ) : props.nextTarget?.kind === "recommended" ? (
            <RecommendedProblemCard
              buttonFullWidth
              buttonLabel="Open next"
              compact
              helper={null}
              onOpenProblem={props.nextTarget.onOpenProblem}
              recommended={props.nextTarget.recommended}
              showNextReviewDate={false}
            />
          ) : props.nextTarget ? (
            <SurfaceCard compact label="Next Up" title={props.nextTarget.title}>
              <Stack spacing={1}>
                <FieldAssistRow
                  tone={props.nextTarget.kind === "loading" ? "accent" : "default"}
                >
                  {props.nextTarget.message}
                </FieldAssistRow>
              </Stack>
            </SurfaceCard>
          ) : null}
        </div>
      </Fade>
    </Collapse>
  );
}
