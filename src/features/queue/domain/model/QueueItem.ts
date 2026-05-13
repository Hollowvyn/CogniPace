import type { Problem } from "../../../../domain/types/Problem";
import type { StudyState , StudyStateSummary } from "@features/study";

export interface QueueItem {
  slug: string;
  problem: Problem;
  studyState: StudyState;
  studyStateSummary: StudyStateSummary;
  due: boolean;
  category: "due" | "new" | "reinforcement";
}
