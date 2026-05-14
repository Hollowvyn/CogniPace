/**
 * Overlay panel view-model types — re-exports the per-type files split
 * in Phase 5. Kept as the public surface for now so existing importers
 * don't churn; Phase 6+ moves these into `features/overlay-session/ui/
 * viewmodels/` and deletes this barrel.
 */
export type { OverlayDraftLogFields } from "./types/OverlayDraftLogFields";
export type { OverlayHeaderStatusTone } from "./types/OverlayHeaderStatusTone";
export type { OverlayHeaderStatusCard } from "./types/OverlayHeaderStatusCard";
export type { OverlayHeaderStatus } from "./types/OverlayHeaderStatus";
export type { OverlayDraftChangeHandler } from "./types/OverlayDraftChangeHandler";
export type { OverlayHeaderSectionViewModel } from "./types/OverlayHeaderSectionViewModel";
export type { OverlayTimerSectionViewModel } from "./types/OverlayTimerSectionViewModel";
export type { OverlayAssessmentSectionViewModel } from "./types/OverlayAssessmentSectionViewModel";
export type { OverlayLogSectionViewModel } from "./types/OverlayLogSectionViewModel";
export type { OverlayFeedbackViewModel } from "./types/OverlayFeedbackViewModel";
export type { OverlayAssistViewModel } from "./types/OverlayAssistViewModel";
export type { CollapsedOverlayActionsViewModel } from "./types/CollapsedOverlayActionsViewModel";
export type { ExpandedOverlayActionsViewModel } from "./types/ExpandedOverlayActionsViewModel";
export type { OverlayPostSubmitNextViewModel } from "./types/OverlayPostSubmitNextViewModel";
export type { CollapsedOverlayViewModel } from "./types/CollapsedOverlayViewModel";
export type { DockedOverlayViewModel } from "./types/DockedOverlayViewModel";
export type { ExpandedOverlayViewModel } from "./types/ExpandedOverlayViewModel";
export type { OverlayRenderModel } from "./types/OverlayRenderModel";
