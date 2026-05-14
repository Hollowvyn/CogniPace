import type { Difficulty } from "@features/problems";
import type { StudyState, StudyStateSummary } from "@features/study";

export interface QueueItem {
  slug: string;
  title: string;
  url: string;
  difficulty: Difficulty;
  studyState: StudyState;
  studyStateSummary: StudyStateSummary;
  due: boolean;
  category: "due" | "new" | "reinforcement";
}
