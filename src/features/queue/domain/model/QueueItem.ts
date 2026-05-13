import type { Problem } from "@features/problems";
import type { StudyState , StudyStateSummary } from "@features/study";

export interface QueueItem {
  slug: string;
  problem: Problem;
  studyState: StudyState;
  studyStateSummary: StudyStateSummary;
  due: boolean;
  category: "due" | "new" | "reinforcement";
}
