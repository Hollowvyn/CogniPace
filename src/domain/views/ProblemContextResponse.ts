import type { Problem } from "../types/Problem";
import type { StudyState } from "../types/StudyState";

export interface ProblemContextResponse {
  problem: Problem | null;
  studyState: StudyState | null;
}
