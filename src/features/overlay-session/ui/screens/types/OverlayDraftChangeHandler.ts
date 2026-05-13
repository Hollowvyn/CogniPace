import type { OverlayDraftLogFields } from "./OverlayDraftLogFields";

export type OverlayDraftChangeHandler = (
  field: keyof OverlayDraftLogFields,
  value: string,
) => void;
