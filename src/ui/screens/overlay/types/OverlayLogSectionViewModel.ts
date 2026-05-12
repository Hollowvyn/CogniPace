import type { OverlayDraftChangeHandler } from "./OverlayDraftChangeHandler";
import type { OverlayDraftLogFields } from "./OverlayDraftLogFields";

export interface OverlayLogSectionViewModel {
  draft: OverlayDraftLogFields;
  onChange: OverlayDraftChangeHandler;
}
