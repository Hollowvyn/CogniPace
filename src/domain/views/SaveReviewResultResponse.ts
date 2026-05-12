import type { Rating } from "../types/Rating";
import type { StudyPhase } from "../types/StudyPhase";
import type { StudyState } from "../types/StudyState";

export interface SaveReviewResultResponse {
  studyState: StudyState;
  nextReviewAt?: string;
  phase: StudyPhase;
  lastRating?: Rating;
}
