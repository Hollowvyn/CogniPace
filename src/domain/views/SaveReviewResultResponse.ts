import type { Rating , StudyPhase , StudyState } from "@features/study";

export interface SaveReviewResultResponse {
  studyState: StudyState;
  nextReviewAt?: string;
  phase: StudyPhase;
  lastRating?: Rating;
}
