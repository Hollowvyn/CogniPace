import {InlineStatusRegion} from "../../../components";
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
