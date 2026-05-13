import type { TrackCardView } from "./TrackCardView";
import type { TrackChapterView } from "./TrackChapterView";
import type { TrackQuestionView } from "./TrackQuestionView";

export interface ActiveTrackView extends TrackCardView {
  activeChapterId: string | null;
  activeChapterTitle: string | null;
  nextQuestion: TrackQuestionView | null;
  chapters: TrackChapterView[];
}
