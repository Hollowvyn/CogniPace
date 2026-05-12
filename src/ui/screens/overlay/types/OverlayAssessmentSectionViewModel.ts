import type { Rating } from "../../../../domain/types/Rating";

export interface OverlayAssessmentSectionViewModel {
  disabledRatings: Rating[];
  onSelectRating: (rating: Rating) => void;
  selectedRating: Rating;
}
