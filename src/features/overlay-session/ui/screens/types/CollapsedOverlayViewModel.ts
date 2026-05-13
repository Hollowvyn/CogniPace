import type { CollapsedOverlayActionsViewModel } from "./CollapsedOverlayActionsViewModel";
import type { OverlayAssistViewModel } from "./OverlayAssistViewModel";
import type { OverlayFeedbackViewModel } from "./OverlayFeedbackViewModel";
import type { OverlayTimerSectionViewModel } from "./OverlayTimerSectionViewModel";

export interface CollapsedOverlayViewModel {
  actions: CollapsedOverlayActionsViewModel;
  assist: OverlayAssistViewModel;
  feedback: OverlayFeedbackViewModel | null;
  timer: OverlayTimerSectionViewModel;
}
