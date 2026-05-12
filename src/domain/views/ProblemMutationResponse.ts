import type { Problem } from "../types/Problem";
import type { StudyState } from "../types/StudyState";

export interface ProblemMutationResponse {
  problem: Problem;
  studyState: StudyState;
}
