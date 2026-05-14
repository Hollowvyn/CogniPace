import type { Problem } from "./Problem";
import type { StudyState } from "@features/study";


export interface ProblemSnapshot {
  problem: Problem;
  studyState: StudyState;
}
