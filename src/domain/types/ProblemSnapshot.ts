import type { Problem } from "./Problem";
import type { StudyState } from "./StudyState";

export interface ProblemSnapshot {
  problem: Problem;
  studyState: StudyState;
}
