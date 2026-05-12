import {InlineStatusRegion} from "@design-system/atoms";

import {OverlayFeedbackViewModel} from "../overlayPanel.types";

export function OverlayFeedbackSurface(
  props: {
    feedback: OverlayFeedbackViewModel;
  }
) {
  return (
    <InlineStatusRegion
      isError={props.feedback.isError}
      message={props.feedback.message}
    />
  );
}
