import type { Rating } from "../Rating";
import type { StudyPhase } from "../StudyPhase";
import type { StudyState } from "../StudyState";

export interface SaveReviewResultResponse {
  studyState: StudyState;
  nextReviewAt?: string;
  phase: StudyPhase;
  lastRating?: Rating;
}
