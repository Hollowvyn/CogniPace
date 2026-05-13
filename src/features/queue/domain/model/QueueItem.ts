import type { Problem } from "../../../../domain/types/Problem";
import type { StudyState } from "../../../../domain/types/StudyState";
import type { StudyStateSummary } from "../../../../domain/types/StudyStateSummary";

export interface QueueItem {
  slug: string;
  problem: Problem;
  studyState: StudyState;
  studyStateSummary: StudyStateSummary;
  due: boolean;
  category: "due" | "new" | "reinforcement";
}
