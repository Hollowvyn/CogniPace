import type { Problem } from "../Problem";
import type { StudyState } from "@features/study";

export interface ProblemContextResponse {
  problem: Problem | null;
  studyState: StudyState | null;
}
