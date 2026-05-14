import type { Rating } from "@features/study";

export interface OverlayAssessmentSectionViewModel {
  disabledRatings: Rating[];
  onSelectRating: (rating: Rating) => void;
  selectedRating: Rating;
}
