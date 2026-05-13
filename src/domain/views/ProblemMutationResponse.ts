import type { Problem } from "../types/Problem";
import type { StudyState } from "@features/study";

export interface ProblemMutationResponse {
  problem: Problem;
  studyState: StudyState;
}
