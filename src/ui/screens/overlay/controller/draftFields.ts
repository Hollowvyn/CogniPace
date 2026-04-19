import {StudyState} from "../../../../domain/types";
import {OverlayDraftLogFields} from "../overlayPanel.types";

export function emptyDraft(): OverlayDraftLogFields {
  return {
    interviewPattern: "",
    timeComplexity: "",
    spaceComplexity: "",
    languages: "",
    notes: "",
  };
}

export function cloneDraft(
  draft: OverlayDraftLogFields
): OverlayDraftLogFields {
  return {
    interviewPattern: draft.interviewPattern,
    timeComplexity: draft.timeComplexity,
    spaceComplexity: draft.spaceComplexity,
    languages: draft.languages,
    notes: draft.notes,
  };
}

export function draftFromStudyState(
  state: StudyState | null
): OverlayDraftLogFields {
  return {
    interviewPattern: state?.interviewPattern ?? "",
    timeComplexity: state?.timeComplexity ?? "",
    spaceComplexity: state?.spaceComplexity ?? "",
    languages: state?.languages ?? "",
    notes: state?.notes ?? "",
  };
}

export function reviewPayloadFromDraft(draft: OverlayDraftLogFields) {
  return {
    interviewPattern: draft.interviewPattern,
    timeComplexity: draft.timeComplexity,
    spaceComplexity: draft.spaceComplexity,
    languages: draft.languages,
    notes: draft.notes,
  };
}

export function draftsEqual(
  left: OverlayDraftLogFields,
  right: OverlayDraftLogFields
): boolean {
  return (
    left.interviewPattern === right.interviewPattern &&
    left.timeComplexity === right.timeComplexity &&
    left.spaceComplexity === right.spaceComplexity &&
    left.languages === right.languages &&
    left.notes === right.notes
  );
}
