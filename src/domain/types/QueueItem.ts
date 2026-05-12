import type { Problem } from "./Problem";
import type { StudyState } from "./StudyState";
import type { StudyStateSummary } from "./StudyStateSummary";

export interface QueueItem {
  slug: string;
  problem: Problem;
  studyState: StudyState;
  studyStateSummary: StudyStateSummary;
  due: boolean;
  category: "due" | "new" | "reinforcement";
}
