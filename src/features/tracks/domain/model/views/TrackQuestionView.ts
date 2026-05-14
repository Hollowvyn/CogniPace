import type { TrackQuestionStatusView } from "./TrackQuestionStatusView";
import type { Difficulty } from "@features/problems";
import type { StudyPhase } from "@features/study";


export interface TrackQuestionView {
  slug: string;
  title: string;
  url: string;
  difficulty: Difficulty;
  /** ID of the Track chapter (group) containing this question. */
  groupId: string;
  chapterTitle: string;
  status: TrackQuestionStatusView;
  reviewPhase?: StudyPhase;
  nextReviewAt?: string;
  inLibrary: boolean;
  isCurrent: boolean;
}
