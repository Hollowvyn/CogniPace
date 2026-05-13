import type { Problem } from "@features/problems";
import type { StudyState } from "@features/study";

export interface ProblemContextResponse {
  problem: Problem | null;
  studyState: StudyState | null;
}
