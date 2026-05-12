import type { ExpandedOverlayActionsViewModel } from "./ExpandedOverlayActionsViewModel";
import type { OverlayAssessmentSectionViewModel } from "./OverlayAssessmentSectionViewModel";
import type { OverlayAssistViewModel } from "./OverlayAssistViewModel";
import type { OverlayFeedbackViewModel } from "./OverlayFeedbackViewModel";
import type { OverlayHeaderSectionViewModel } from "./OverlayHeaderSectionViewModel";
import type { OverlayLogSectionViewModel } from "./OverlayLogSectionViewModel";
import type { OverlayPostSubmitNextViewModel } from "./OverlayPostSubmitNextViewModel";
import type { OverlayTimerSectionViewModel } from "./OverlayTimerSectionViewModel";

export interface ExpandedOverlayViewModel {
  actions: ExpandedOverlayActionsViewModel;
  actionAssist: OverlayAssistViewModel;
  assessment: OverlayAssessmentSectionViewModel;
  assessmentAssist: OverlayAssistViewModel;
  feedback: OverlayFeedbackViewModel | null;
  header: OverlayHeaderSectionViewModel;
  onClickAway: () => void;
  log: OverlayLogSectionViewModel;
  postSubmitNext: OverlayPostSubmitNextViewModel | null;
  timer: OverlayTimerSectionViewModel & {
    targetDisplay: string;
  };
}
