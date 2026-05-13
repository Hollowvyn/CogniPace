import type { TrackChapterStatusView } from "./TrackChapterStatusView";
import type { TrackQuestionView } from "./TrackQuestionView";

export interface TrackChapterView {
  id: string;
  title: string;
  order: number;
  status: TrackChapterStatusView;
  totalQuestions: number;
  completedQuestions: number;
  questions: TrackQuestionView[];
}
