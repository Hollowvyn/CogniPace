import type { Problem } from "@features/problems";
import type { StudyState } from "@features/study";

export interface ProblemMutationResponse {
  problem: Problem;
  studyState: StudyState;
}
